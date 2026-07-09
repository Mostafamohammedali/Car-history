"""
Cars Views - Simplified API endpoints using Reports model only
Optimized for React frontend with clean, minimal code
"""

import json
import logging
import time
import uuid
from datetime import timedelta
from typing import Dict, Any, Optional
import random
import string

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.auth import authenticate
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count
from django.core.mail import send_mail
from functools import wraps

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Cars, Reports, ContactMessage, Evaluation, ImageCar, AccidentImage, Repairshops
)
from .serializers import (
    CarsSerializer, ReportsSerializer, ContactMessageSerializer,
    EvaluationCreateSerializer
)
from .car_service import VehicleDataService
from .vin_decoder import vin_decoder_service

logger = logging.getLogger(__name__)


def api_login_required(view_func):
    """
    Custom decorator for API endpoints that requires authentication.
    Returns 401 JSON response instead of redirecting to login page.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'message': 'Authentication required. Please log in.',
                'authenticated': False
            }, status=401)
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def generate_reference_number():
    """Generate unique reference number for contact messages"""
    year = timezone.now().year
    random_part = ''.join(random.choices(string.digits, k=5))
    return f"CM-{year}-{random_part}"


# --- API Helper Functions ---


def create_api_response(success=True, data=None, message="", status_code=200):
    """Create standardized API response"""
    response = {
        'success': success,
        'message': message,
        'timestamp': timezone.now().isoformat()
    }
    if data:
        response['data'] = data
    return JsonResponse(response, status=status_code)


def validate_json_data(request, required_fields=None):
    """Validate JSON request data"""
    try:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
        else:
            data = request.POST.dict()
        
        if required_fields:
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return None, JsonResponse({
                    'success': False,
                    'message': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=400)
        
        return data, None
    except json.JSONDecodeError:
        return None, JsonResponse({
            'success': False,
            'message': 'Invalid JSON data'
        }, status=400)


# API Endpoints

@api_view(['GET'])
@permission_classes([AllowAny])
def search_car(request):
    """
    API endpoint for VIN search — LOCAL DATABASE ONLY.

    Returns vehicle data if the VIN exists in the local database.
    Returns HTTP 404 if the VIN is not found locally.
    External APIs and web scraping are NEVER triggered here;
    data is pre-populated by the scheduled 24-hour sync task.
    """
    try:
        vin = request.GET.get('vin', '').strip()
        if not vin:
            return create_api_response(
                success=False,
                message='VIN parameter is required',
                status_code=400,
            )

        # Check authentication - Guest users cannot access full reports directly
        if not request.user.is_authenticated:
            return create_api_response(
                success=False,
                message='قم بتسجيل حسابك للبحث عن سياره',
                status_code=401,
            )

        service = VehicleDataService()

        if not service.validate_vin(vin):
            return create_api_response(
                success=False,
                message='Invalid VIN format. Must be 17 alphanumeric characters.',
                status_code=400,
            )

        start_time = time.time()
        data = service.get_local_vehicle_data(vin)
        processing_time = round(time.time() - start_time, 2)

        if not data:
            logger.info(f"VIN {vin} not found in local database.")
            return create_api_response(
                success=False,
                message=(
                    'Vehicle not found in our database. '
                    'Data is refreshed every 24 hours from external sources.'
                ),
                status_code=404,
            )

        data['search_metadata'] = {
            'source': 'local_database',
            'processing_time': f"{processing_time}s",
        }

        return create_api_response(
            success=True,
            data=data,
            message='Vehicle data found in local database.',
        )

    except Exception as e:
        logger.error(f"Error searching car by VIN: {str(e)}")
        return create_api_response(success=False, message=str(e), status_code=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_complete_report(request, vin):
    """
    API endpoint to get complete car report data from local database.
    """
    try:
        # Check authentication
        if not request.user.is_authenticated:
            return create_api_response(
                success=False,
                message='قم بتسجيل حسابك للبحث عن سياره',
                status_code=401,
            )

        service = VehicleDataService()
        data = service.get_local_vehicle_data(vin)
        
        if not data:
            return create_api_response(success=False, message='Report not found', status_code=404)
        
        return create_api_response(success=True, data=data, message='Complete report retrieved successfully')
        
    except Exception as e:
        logger.error(f"Error getting complete report for VIN {vin}: {str(e)}")
        return create_api_response(success=False, message=str(e), status_code=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_or_update_report(request, vin):
    """
    API endpoint for creating or updating car reports automatically
    Updates statistics based on Reports model
    """
    try:
        # Get car object
        car = get_object_or_404(Cars, vin__iexact=vin)
        
        # Check if report exists
        report = Reports.objects.filter(car=car).order_by('-created_at').first()
        
        if not report:
            # Create new report
            report = Reports.objects.create(
                car=car,
                created_by=request.user
            )
        
        # Update statistics
        report.update_report_data()
        
        return create_api_response(
            success=True,
            data={
                'report_id': report.report_id,
                'report_uuid': str(report.report_uuid),
                'vin': car.vin,
                'statistics': {
                    'total_images': car.images.count(),
                    'total_accident_images': car.accident_images.count(),
                    'avg_rating': report.avg_user_rating,
                },
                'overall_ai_score': report.overall_ai_score,
                'created_at': report.created_at.isoformat(),
                'updated_at': report.updated_at.isoformat()
            },
            message='Report created/updated successfully'
        )
        
    except Exception as e:
        logger.error(f"Error creating/updating report for VIN {vin}: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error creating/updating report: {str(e)}',
            status_code=500
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_report_statistics(request, vin):
    """
    API endpoint to get report statistics from Reports model
    """
    try:
        report = Reports.objects.filter(car__vin__iexact=vin).order_by('-created_at').first()
        
        if not report:
            return create_api_response(
                success=False,
                message='No report found for this VIN',
                status_code=404
            )
        
        # Update statistics
        report.update_report_data()
        
        return create_api_response(
            success=True,
            data={
                'report_id': report.report_id,
                'report_uuid': str(report.report_uuid),
                'vin': vin,
                'statistics': {
                    'total_images': report.car.images.count(),
                    'total_accident_images': report.car.accident_images.count(),
                    'avg_rating': report.avg_user_rating,
                },
                'overall_ai_score': report.overall_ai_score,
                'created_at': report.created_at.isoformat(),
                'updated_at': report.updated_at.isoformat()
            },
            message='Report statistics retrieved successfully'
            
        )
        
    except Exception as e:
        logger.error(f"Error getting report statistics for VIN {vin}: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error retrieving report statistics: {str(e)}',
            status_code=500
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_report_by_uuid(request, report_uuid):
    """
    API endpoint to retrieve a report directly by its UUID.
    Used for sharing report links securely.
    Queries local database only.
    """
    try:
        report = Reports.objects.filter(report_uuid=report_uuid).first()
        if not report:
            return create_api_response(success=False, message='Report not found', status_code=404)

        service = VehicleDataService()
        complete_data = service.get_local_vehicle_data(report.car.vin)

        if not complete_data:
            return create_api_response(
                success=False,
                message='Report data not available in local database.',
                status_code=404,
            )

        return create_api_response(
            success=True,
            data=complete_data,
            message='Report retrieved successfully by UUID',
        )
    except Exception as e:
        logger.error(f"Error getting report by UUID {report_uuid}: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error retrieving report: {str(e)}',
            status_code=500,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def contact(request):
    """
    API endpoint for contact form
    Uses serializers for data validation
    """
    # DRF handles JSON parsing in request.data
    data = request.data
    
    # Required fields check
    required_fields = ['name', 'email', 'message']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return create_api_response(
            success=False,
            message=f'Missing required fields: {", ".join(missing_fields)}',
            status_code=400
        )
    
    try:
        # Create contact message using serializer
        contact_data = {
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone', ''),
            'subject': data.get('subject', 'general'),
            'message': data.get('message'),
            'vin': data.get('vin', ''),
            'urgent': data.get('urgent', False)
        }
        
        serializer = ContactMessageSerializer(data=contact_data)
        if serializer.is_valid():
            # Generate reference number first
            reference_number = generate_reference_number()
            
            # Save contact with reference number
            contact = serializer.save(reference_number=reference_number)
            
            # Send confirmation email to user
            try:
                urgency_status = "عاجل" if contact.urgent else "عادي"
                send_mail(
                    subject='تم استلام رسالتك - Car History',
                    message=f'''
مرحباً {contact.name},

نشكرك على تواصلك معنا في Car History.

تم استلام رسالتك بنجاح برقم المرجع: {reference_number}

{'' if not contact.urgent else '⚠️ رسالتك تم تصنيفها كرسالة عاجلة وسيتم الرد عليها بأولوية قصوى.'}

تفاصيل رسالتك:
- الموضوع: {contact.get_subject_display()}
- الأولوية: {urgency_status}
- تاريخ الإرسال: {contact.created_at.strftime('%Y-%m-%d %H:%M')}

{'' if not contact.vin else f'- رقم الهيكل (VIN): {contact.vin}'}

سنقوم بمراجعة رسالتك والرد عليك في أقرب وقت ممكن.

مع أطيب التحيات،
فريق Car History
                    '''.strip(),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[contact.email],
                    fail_silently=True,
                )
            except Exception as email_error:
                # Log email error but don't fail the request
                print(f"Error sending confirmation email to user: {email_error}")
            
            # Send notification to admin
            try:
                urgency_indicator = "🚨 عاجل جداً - رسالة طلب عاجلة" if contact.urgent else "ℹ️ رسالة طلب "
                send_mail(
                    subject=f"{'🚨 عاجل' if contact.urgent else ''} رسالة اتصال جديدة - Car History",
                    message=f'''
{urgency_indicator}

تم استلام رسالة اتصال جديدة:

تفاصيل المرسل:
- الاسم: {contact.name}
- البريد الإلكتروني: {contact.email}
- رقم الهاتف: {contact.phone or 'غير متوفر'}
- رقم المرجع: {reference_number}

تفاصيل الرسالة:
- الموضوع: {contact.get_subject_display()}
- الأولوية: {'عاجل - يتطلب رد سريع' if contact.urgent else 'عادية'}
- VIN: {contact.vin or 'غير متوفر'}
- تاريخ الإرسال: {contact.created_at.strftime('%Y-%m-%d %H:%M')}

{'⚠️ هذه رسالة عاجلة! يرجى الرد في أقرب وقت ممكن.' if contact.urgent else ''}

الرسالة:
{contact.message}

يمكن الرد على الرسالة عبر لوحة الإدارة.
                    '''.strip(),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[settings.ADMIN_EMAIL],
                    fail_silently=True,
                )
            except Exception as admin_email_error:
                # Log email error but don't fail the request
                print(f"Error sending notification email to admin: {admin_email_error}")
            
            return create_api_response(
                success=True,
                data={
                    'contact_id': contact.message_id,
                    'reference_number': reference_number
                },
                message='تم إرسال الرسالة بنجاح'
            )
        else:
            return create_api_response(
                success=False,
                message='بيانات الاتصال غير صالحة',
                data={'errors': serializer.errors},
                status_code=400
            )
            
    except Exception as e:
        return create_api_response(
            success=False,
            message=f'خطأ في الاتصال: {str(e)}',
            status_code=500
        )



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_stats(request):
    """
    API endpoint to get user statistics from Reports model
    """
    try:
        user_reports = Reports.objects.filter(created_by=request.user)
        
        # In a real app, you would count these from respective models
        # For now, we provide the structure the frontend expects
        stats = {
            'reports_count': user_reports.count(),
            'saved_cars': 0, # Placeholder or count from SavedCars model if it exists
            'vin_searches': 0, # Placeholder
        }
        
        return create_api_response(
            success=True,
            data=stats,
            message='User statistics retrieved successfully'
        )
        
    except Exception as e:
        logger.error(f"Error getting user stats for user {request.user.id}: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error retrieving user statistics: {str(e)}',
            status_code=500
        )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def vin_search_view(request):
    """
    VIN search endpoint — LOCAL DATABASE ONLY.

    Accepts GET ?vin=... or POST {"vin": "..."}
    Returns HTTP 404 when the VIN is not in the local database.
    The scheduled 24-hour sync task populates the database in advance.
    """
    if request.method == 'GET':
        vin = request.GET.get('vin', '').strip()
    elif request.method == 'POST':
        # DRF handles JSON parsing in request.data
        vin = request.data.get('vin', '').strip()
    
    if not vin:
        return create_api_response(
            success=False,
            message='VIN number is required.',
            status_code=400,
        )

    try:
        # Check authentication - Guest users cannot access full reports directly
        if not request.user.is_authenticated:
            return create_api_response(
                success=False,
                message='قم بتسجيل حسابك للبحث عن سياره',
                status_code=401,
            )

        vehicle_service = VehicleDataService()

        if not vehicle_service.validate_vin(vin):
            return create_api_response(
                success=False,
                message='Invalid VIN format. Must be 17 alphanumeric characters.',
                status_code=400,
            )

        logger.info(f"[SEARCH] Local DB lookup for VIN: {vin}")
        start_time = time.time()
        vehicle_data = vehicle_service.get_local_vehicle_data(vin)
        processing_time = round(time.time() - start_time, 2)

        if not vehicle_data:
            logger.info(f"[SEARCH] VIN {vin} not found in local database.")
            return create_api_response(
                success=False,
                message=(
                    'Vehicle not found in our database. '
                    'Our database is refreshed every 24 hours.'
                ),
                status_code=404,
            )

        vehicle_data['processing_time'] = f"{processing_time}s"
        vehicle_data['timestamp'] = timezone.now().isoformat()
        vehicle_data['data_source'] = 'local_database'

        logger.info(
            f"[SEARCH] VIN {vin} found locally in {processing_time}s."
        )
        return create_api_response(
            success=True,
            data=vehicle_data,
            message=f'Vehicle data found in local database in {processing_time}s.',
        )

    except Exception as e:
        logger.error(f"[SEARCH] Critical error for VIN {vin}: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Internal server error: {str(e)}',
            status_code=500,
        )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def vin_decode_view(request):
    """
    Vista dedicada para decodificación de VIN local
    Proporciona información básica del vehículo sin necesidad de APIs externas
    
    Methods:
    - GET: Decodificar VIN (parámetro 'vin')
    - POST: Decodificar VIN (en cuerpo JSON)
    
    Returns:
    JsonResponse: Información decodificada del vehículo con is_decoded_locally: true
    """
    if request.method == 'GET':
        vin = request.GET.get('vin', '').strip()
        include_details = request.GET.get('include_details', 'true').lower() == 'true'
    elif request.method == 'POST':
        # DRF handles JSON parsing in request.data
        vin = request.data.get('vin', '').strip()
        include_details = request.data.get('include_details', True)
    
    # Check authentication
    if not request.user.is_authenticated:
        return create_api_response(
            success=False,
            message='قم بتسجيل حسابك للبحث عن سياره',
            status_code=401,
        )

    # Validar que se proporcionó un VIN
    if not vin:
        return create_api_response(
            success=False,
            message='El número VIN es requerido',
            status_code=400
        )
    
    try:
        logger.info(f"Iniciando decodificación local de VIN: {vin}")
        start_time = time.time()
        
        # Usar el servicio de decodificación local
        decode_result = vin_decoder_service.decode_vin(vin, include_details=include_details)
        
        processing_time = round(time.time() - start_time, 2)
        
        if decode_result.get('success', False):
            # Agregar metadatos de procesamiento
            decode_result['processing_time'] = f"{processing_time}s"
            decode_result['is_decoded_locally'] = True
            decode_result['api_endpoint'] = 'vin-decode'
            
            # Mensaje informativo para el usuario
            vehicle_info = decode_result.get('vehicle_info', {})
            make = vehicle_info.get('make', 'Desconocido')
            year = vehicle_info.get('year', 'Desconocido')
            country = vehicle_info.get('country', 'Desconocido')
            
            user_message = f'VIN decodificado localmente: {make} {year} ({country}). Datos básicos del fabricante sin historial de accidentes.'
            
            logger.info(f"Decodificación VIN {vin} completada en {processing_time}s. Fabricante: {make}")
            
            return create_api_response(
                success=True,
                data=decode_result,
                message=user_message
            )
        else:
            # Error en decodificación
            error_msg = decode_result.get('error', 'Error desconocido en decodificación')
            logger.error(f"Error en decodificación VIN {vin}: {error_msg}")
            
            return create_api_response(
                success=False,
                message=error_msg,
                status_code=400
            )
    
    except Exception as e:
        # Capturar errores inesperados
        logger.error(f"Error crítico en decodificación VIN {vin}: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error interno del servidor: {str(e)}',
            status_code=500
        )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def vin_validate_view(request):
    """
    Vista para validar formato de VIN usando el servicio de decodificación
    Versión mejorada usando el servicio dedicado de VIN
    
    Methods:
    - GET: Validar VIN (parámetro 'vin')
    - POST: Validar VIN (en cuerpo JSON)
    
    Returns:
    JsonResponse: Resultado de validación del VIN con detalles
    """
    if request.method == 'GET':
        vin = request.GET.get('vin', '').strip()
    elif request.method == 'POST':
        # DRF handles JSON parsing in request.data
        vin = request.data.get('vin', '').strip()
    
    # Check authentication
    if not request.user.is_authenticated:
        return create_api_response(
            success=False,
            message='قم بتسجيل حسابك للبحث عن سياره',
            status_code=401,
        )
    
    if not vin:
        return create_api_response(
            success=False,
            message='El número VIN es requerido',
            status_code=400
        )
    
    try:
        # Usar el servicio de validación dedicado
        validation_result = vin_decoder_service.validate_vin(vin)
        
        if validation_result['is_valid']:
            return create_api_response(
                success=True,
                data=validation_result,
                message=f'Formato VIN válido: {vin.upper()}'
            )
        else:
            error_msg = validation_result['error_message']
            return create_api_response(
                success=False,
                message=error_msg,
                data=validation_result,
                status_code=400
            )
    
    except Exception as e:
        logger.error(f"Error validando VIN {vin}: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error interno del servidor: {str(e)}',
            status_code=500
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def vin_batch_decode_view(request):
    """
    Vista para decodificación múltiple de VINs en lote
    """
    try:
        # DRF handles JSON parsing in request.data
        vin_list = request.data.get('vin_list', [])
        
        # Check authentication
        if not request.user.is_authenticated:
            return create_api_response(
                success=False,
                message='قم بتسجيل حسابك للبحث عن سياره',
                status_code=401,
            )
        
        if not vin_list:
            return create_api_response(
                success=False,
                message='La lista de VINs es requerida',
                status_code=400
            )
        
        if len(vin_list) > 50:  # Límite para prevenir sobrecarga
            return create_api_response(
                success=False,
                message='Máximo 50 VINs permitidos por solicitud',
                status_code=400
            )
        
        logger.info(f"Iniciando decodificación en lote de {len(vin_list)} VINs")
        
        # Usar el servicio de decodificación en lote
        batch_result = vin_decoder_service.batch_decode(vin_list)
        
        if batch_result.get('success', False):
            batch_result['is_decoded_locally'] = True
            batch_result['api_endpoint'] = 'vin-batch-decode'
            
            successful = batch_result['successful_decodes']
            failed = batch_result['failed_decodes']
            
            user_message = f'Decodificación en lote completada: {successful} exitosos, {failed} fallidos'
            
            return create_api_response(
                success=True,
                data=batch_result,
                message=user_message
            )
        else:
            error_msg = batch_result.get('error', 'Error desconocido en procesamiento por lote')
            return create_api_response(
                success=False,
                message=error_msg,
                status_code=400
            )
    
    except Exception as e:
        logger.error(f"Error en decodificación por lote: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error interno del servidor: {str(e)}',
            status_code=500
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def vin_supported_manufacturers_view(request):
    """
    Vista para obtener lista de fabricantes soportados
    """
    try:
        # Obtener fabricantes soportados del servicio
        manufacturers_info = vin_decoder_service.get_supported_manufacturers()
        
        return create_api_response(
            success=True,
            data=manufacturers_info,
            message=f'Se soportan {manufacturers_info["total_manufacturers"]} fabricantes'
        )
    
    except Exception as e:
        logger.error(f"Error obteniendo fabricantes soportados: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error interno del servidor: {str(e)}',
            status_code=500
        )


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def integrated_vin_search_view(request):
    """
    Integrated VIN Search - Centralized entry point for the vehicle data pipeline.
    Coordinates searching local DB, external APIs, and VIN decoding fallback.
    """
    if request.method == 'GET':
        vin = request.GET.get('vin', '').strip()
    else:
        # DRF handles JSON parsing in request.data
        vin = request.data.get('vin', '').strip()
    
    if not vin:
        return create_api_response(success=False, message='VIN is required', status_code=400)
    
    try:
        service = VehicleDataService()
        user_authenticated = request.user.is_authenticated
        result = service.get_integrated_search_workflow(vin, user_authenticated=user_authenticated)
        
        if result['success']:
            return create_api_response(
                success=True,
                data=result,
                message=f'Vehicle data retrieved successfully via {result["source"]}'
            )
        else:
            return create_api_response(
                success=False,
                message=result['error'],
                data=result,
                status_code=404
            )
            
    except Exception as e:
        logger.error(f"Integrated search view failed: {str(e)}")
        return create_api_response(success=False, message=str(e), status_code=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_evaluation(request):
    """
    API endpoint to create a new vehicle evaluation/comment.
    Requires authentication.
    """
    # DRF handles JSON parsing in request.data
    data = request.data
    
    if 'vin' not in data:
        return create_api_response(
            success=False,
            message='VIN parameter is required',
            status_code=400
        )
    
    try:
        vin = data.get('vin')
        # Support both 'rate' and 'rating' from frontend
        rating_value = data.get('rate') or data.get('rating')
        
        if rating_value is None:
             return create_api_response(
                success=False,
                message='Rating (rate/rating) is required',
                status_code=400
            )

        # Get car instance
        car = get_object_or_404(Cars, vin__iexact=vin)
        
        # Prepare evaluation data
        evaluation_data = {
            'car': car.vin, # Cars uses VIN as PK
            'rate': rating_value,
            'comment': data.get('comment', ''),
            'would_recommend': data.get('would_recommend', True),
            'pros': data.get('pros', ''),
            'cons': data.get('cons', '')
        }
        
        # Check if evaluation already exists for this user and car to avoid IntegrityError
        evaluation = Evaluation.objects.filter(car=car, user=request.user).first()
        
        if evaluation:
            # Update existing evaluation
            serializer = EvaluationCreateSerializer(evaluation, data=evaluation_data)
            message = 'تم تحديث تقييمك بنجاح'
        else:
            # Create new evaluation
            serializer = EvaluationCreateSerializer(data=evaluation_data)
            message = 'تم إرسال تقييمك بنجاح'
            
        if serializer.is_valid():
            # Save evaluation with current user
            serializer.save(user=request.user)
            
            # Update avg_user_rating ONLY — user evaluations must NOT trigger AI re-evaluation
            # AI scores (engine, body, safety, electronics, value) are driven exclusively by
            # technical data (maintenance logs, computer scan, accident images).
            report = Reports.objects.filter(car=car).order_by('-created_at').first()
            if report:
                try:
                    from django.db.models import Avg
                    avg = car.evaluations.aggregate(Avg('rate'))['rate__avg']
                    report.avg_user_rating = avg
                    report.save(update_fields=['avg_user_rating'])
                except Exception as stats_error:
                    logger.warning(f"Failed to update avg_user_rating after evaluation: {stats_error}")
            
            return create_api_response(
                success=True,
                data=serializer.data,
                message=message
            )
        else:
            return create_api_response(
                success=False,
                message='بيانات التقييم غير صالحة',
                data=serializer.errors,
                status_code=400
            )
    except Exception as e:
        logger.error(f"Error in create_evaluation: {str(e)}")
        return create_api_response(
            success=False,
            message=f'خطأ في إرسال التقييم: {str(e)}',
            status_code=500
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_evaluation(request, evaluation_id):
    """
    API endpoint to delete a vehicle evaluation.
    Only the owner can delete it.
    """
    try:
        evaluation = get_object_or_404(Evaluation, evaluation_id=evaluation_id)
        
        # Check ownership
        if evaluation.user != request.user:
            return create_api_response(
                success=False,
                message='ليس لديك صلاحية لحذف هذا التقييم',
                status_code=403
            )
            
        car = evaluation.car
        evaluation.delete()
        
        # Update avg_user_rating ONLY — user evaluations must NOT trigger AI re-evaluation
        report = Reports.objects.filter(car=car).order_by('-created_at').first()
        if report:
            try:
                from django.db.models import Avg
                remaining = car.evaluations.all()
                if remaining.exists():
                    report.avg_user_rating = remaining.aggregate(Avg('rate'))['rate__avg']
                else:
                    report.avg_user_rating = None
                report.save(update_fields=['avg_user_rating'])
            except Exception as stats_error:
                logger.warning(f"Failed to update avg_user_rating after evaluation deletion: {stats_error}")
                
        return create_api_response(
            success=True,
            message='تم حذف التقييم بنجاح'
        )
        
    except Exception as e:
        logger.error(f"Error in delete_evaluation: {str(e)}")
        return create_api_response(
            success=False,
            message=f'خطأ في حذف التقييم: {str(e)}',
            status_code=500
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def platform_stats(request):
    """
    Public API endpoint for platform statistics shown on the home page.
    No authentication required.
    """
    try:
        total_cars = Cars.objects.count()
        total_reports = Reports.objects.count()
        total_evaluations = Evaluation.objects.count()
        total_users = Reports.objects.values('created_by').distinct().count()

        # Average AI score across all reports
        from django.db.models import Avg
        avg_score_result = Reports.objects.aggregate(avg=Avg('overall_ai_score'))
        avg_ai_score = round(avg_score_result['avg'] or 0, 1)

        # Supported manufacturers count
        try:
            manufacturers_info = vin_decoder_service.get_supported_manufacturers()
            supported_manufacturers = manufacturers_info.get('total_manufacturers', 0)
        except Exception:
            supported_manufacturers = 0

        stats = {
            'total_cars': total_cars,
            'total_reports': total_reports,
            'total_evaluations': total_evaluations,
            'total_users': total_users,
            'avg_ai_score': avg_ai_score,
            'supported_manufacturers': supported_manufacturers,
        }

        return create_api_response(
            success=True,
            data=stats,
            message='Platform statistics retrieved successfully'
        )

    except Exception as e:
        logger.error(f"Error getting platform stats: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error retrieving platform statistics: {str(e)}',
            status_code=500
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def recent_cars(request):
    """
    Public API endpoint for recently searched cars shown on the home page.
    No authentication required. Returns last 8 cars with reports.
    """
    try:
        limit = int(request.GET.get('limit', 8))
        limit = min(limit, 20)  # Cap at 20

        recent_reports = Reports.objects.select_related('car').order_by('-created_at')[:limit]

        cars_data = []
        for report in recent_reports:
            car = report.car
            # Get first image if available
            first_image = car.images.first()
            image_url = first_image.get_image_data_url() if first_image else None

            cars_data.append({
                'vin': car.vin,
                'name_car': car.name_car,
                'make': car.make,
                'model': car.model,
                'year': car.year,
                'color': car.color,
                'fuel_type': car.fuel_type,
                'fuel_display': car.get_fuel_type_display() if hasattr(car, 'get_fuel_type_display') else car.fuel_type,
                'gear_type': car.gear_type,
                'gear_display': 'أوتوماتيك' if car.gear_type == 2 else 'يدوي',
                'mileage': car.mileage,
                'image_url': image_url,
                'overall_ai_score': report.overall_ai_score,
                'report_uuid': str(report.report_uuid),
                'created_at': report.created_at.isoformat(),
            })

        return create_api_response(
            success=True,
            data=cars_data,
            message=f'Recent {len(cars_data)} cars retrieved successfully'
        )

    except Exception as e:
        logger.error(f"Error getting recent cars: {str(e)}")
        return create_api_response(
            success=False,
            message=f'Error retrieving recent cars: {str(e)}',
            status_code=500
        )


# ============================================================================
# API Endpoint لتقدير القيمة السوقية (Market Value Estimation)
# ============================================================================


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_car_core_data(request, vin):
    """
    API endpoint to update car's core data (mileage and year).
    This will trigger the post_save signal which in turn triggers AI re-evaluation.
    """
    try:
        car = get_object_or_404(Cars, vin__iexact=vin)
        
        # Check if user is staff or has permission (optional, based on your requirements)
        # if not request.user.is_staff:
        #     return create_api_response(success=False, message="Permission denied", status_code=403)
            
        data = request.data
        updated = False
        
        if 'mileage' in data:
            car.mileage = int(data['mileage'])
            updated = True
        
        if 'year' in data:
            car.year = int(data['year'])
            updated = True
            
        if updated:
            car.save() # This triggers the AI re-evaluation signal
            return create_api_response(success=True, message="Car data updated and re-evaluation triggered.")
        else:
            return create_api_response(success=False, message="No data provided to update.", status_code=400)
            
    except ValueError:
        return create_api_response(success=False, message="Invalid data format.", status_code=400)
    except Exception as e:
        logger.error(f"Error updating car core data for VIN {vin}: {str(e)}")
        return create_api_response(success=False, message=str(e), status_code=500)
