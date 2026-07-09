"""
AI Chat Views - API endpoints for React frontend
Handles chat sessions, messages, and AI interactions

Privacy Policy:
- Authenticated users: All conversations are saved to database
- Unauthenticated users: Demo mode only, no conversations are saved
- No user data is stored without explicit authentication
"""

import json
import logging
import uuid
import random
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db import transaction
from functools import wraps

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import ChatMessage
from .serializers import (
    ChatMessageSerializer, ChatMessageCreateSerializer,
    ChatHistorySerializer
)

logger = logging.getLogger(__name__)


def create_chat_response(success=True, data=None, message="", status_code=200):
    """Create standardized chat API response"""
    response = {
        'success': success,
        'message': message,
        'timestamp': timezone.now().isoformat()
    }
    if data:
        response['data'] = data
    return JsonResponse(response, status=status_code)


@api_view(['POST'])
@permission_classes([AllowAny])
def send_message(request):
    """
    Send a message to AI chat
    - For authenticated users: saves conversations to database
    - For unauthenticated users: demo mode only, no saving
    """
    try:
        user_message = request.data.get('message')
        if not user_message:
            return JsonResponse({
                'success': False,
                'message': 'Missing required field: message'
            }, status=400)
            
        session_id = request.data.get('session_id', '')
        
        # DEBUG: Log authentication status
        print(f"DEBUG: AIChat request from user: {request.user}")
        print(f"DEBUG: Is authenticated: {request.user.is_authenticated}")
        
        # Check if user is authenticated
        if request.user.is_authenticated:
            # Authenticated users - save conversations to database
            try:
                # Generate session ID if not provided
                final_session_id = session_id or str(uuid.uuid4())
                
                # Save user message to database
                ChatMessage.objects.create(
                    user=request.user,
                    session_id=final_session_id,
                    message_type='user',
                    content=user_message
                )
                
                # Get AI response
                from .services import AutomotiveAIAssistant
                assistant = AutomotiveAIAssistant()
                result = assistant.get_response(user_message, final_session_id)
                
                ai_response = result.get('response', 'أنا مساعد Car History الذكي. يمكنني مساعدتك في معرفة تاريخ السيارات وفحصها.')
                
                # Save AI response to database
                ChatMessage.objects.create(
                    user=request.user,
                    session_id=final_session_id,
                    message_type='ai',
                    content=ai_response
                )
                
                return create_chat_response(
                    success=True,
                    data={
                        'response': ai_response,
                        'session_id': final_session_id,
                        'requires_auth': True,
                        'demo_mode': False,
                        'saved_to_db': True,
                        'message': 'تم حفظ المحادثة في سجلاتك'
                    },
                    message='تم حفظ المحادثة بنجاح'
                )
                
            except Exception as db_error:
                import traceback
                logger.error(f"Database error in send_message: {str(db_error)}")
                logger.error(traceback.format_exc())
                return create_chat_response(
                    success=False,
                    message="حدث خطأ أثناء حفظ المحادثة في قاعدة البيانات. يرجى المحاولة مرة أخرى.",
                    status_code=500
                )
        else:
            # Unauthenticated users - Demo mode (no DB saving)
            try:
                from .services import AutomotiveAIAssistant
                assistant = AutomotiveAIAssistant()
                result = assistant.get_response(user_message)
                
                ai_response = result.get('response', 'أنا مساعد Car History الذكي. يرجى تسجيل الدخول لحفظ محادثاتك.')
                
                return create_chat_response(
                    success=True,
                    data={
                        'response': ai_response,
                        'requires_auth': False,
                        'demo_mode': True,
                        'saved_to_db': False,
                        'message': 'المحادثة في وضع التجربة. سجل دخولك لحفظها.'
                    },
                    message='تم الرد بنجاح (وضع التجربة)'
                )
            except Exception as ai_error:
                logger.error(f"AI error in demo mode: {str(ai_error)}")
                return create_chat_response(
                    success=False,
                    message="عذراً، المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً.",
                    status_code=503
                )
                
    except Exception as e:
        logger.error(f"Critical error in send_message: {str(e)}")
        return create_chat_response(
            success=False,
            message="Internal server error",
            status_code=500
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_car(request):
    """
    API endpoint for deep car analysis using AI
    """
    try:
        vin = request.data.get('vin')
        if not vin:
            return JsonResponse({
                'success': False,
                'message': 'Missing required field: vin'
            }, status=400)

        from .services import AutomotiveAIAssistant
        assistant = AutomotiveAIAssistant()
        result = assistant.evaluate_car_comprehensive(vin)

        if result.get('success'):
            return create_chat_response(
                success=True,
                data=result,
                message="Car analysis completed successfully"
            )
        else:
            return create_chat_response(
                success=False,
                message=result.get('error', 'Failed to analyze car'),
                status_code=400
            )

    except Exception as e:
        logger.error(f"Error in analyze_car: {str(e)}")
        return create_chat_response(
            success=False,
            message="Internal server error during car analysis",
            status_code=500
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_history(request, session_id):
    """Get chat history for a session"""
    try:
        messages = ChatMessage.objects.filter(user=request.user, session_id=session_id).order_by('timestamp')
        
        serializer = ChatHistorySerializer(messages, many=True)
        return create_chat_response(
            success=True,
            data=serializer.data,
            message="Chat history retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        return create_chat_response(
            success=False,
            message="Internal server error",
            status_code=500
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_session_messages(request, session_id):
    """Get all messages for a specific session"""
    try:
        messages = ChatMessage.objects.filter(user=request.user, session_id=session_id).order_by('timestamp')
        
        messages_data = []
        for message in messages:
            messages_data.append({
                'id': message.id,
                'role': 'assistant' if message.message_type == 'ai' else 'user',
                'content': message.content,
                'timestamp': message.timestamp.isoformat()
            })
        
        return create_chat_response(
            success=True,
            data={'messages': messages_data},
            message="Session messages retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting session messages: {str(e)}")
        return create_chat_response(
            success=False,
            message="Internal server error",
            status_code=500
        )



@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_sessions(request):
    """
    Get all chat sessions for the current user with detailed information.
    - Authenticated users: Returns their saved sessions
    - Unauthenticated users: Returns empty list (demo mode)
    """
    try:
        # Check if user is authenticated (DRF populates request.user for JWT)
        if not request.user.is_authenticated:
            logger.debug(f"get_user_sessions: User not authenticated.")
            # Return empty list for unauthenticated users (demo mode)
            return create_chat_response(
                success=True,
                data={'sessions': []},
                message="No sessions available. Please log in to save conversations."
            )
        
        logger.info(f"Retrieving chat sessions for user: {request.user.username} (ID: {request.user.id})")
        
        # Get all unique session IDs for this user, ordered by the most recent message
        from django.db.models import Max, Count
        
        sessions = ChatMessage.objects.filter(user=request.user) \
            .values('session_id') \
            .annotate(last_timestamp=Max('timestamp'), msg_count=Count('id')) \
            .order_by('-last_timestamp')
        
        # Get detailed session data
        sessions_data = []
        for sess in sessions:
            session_id = sess['session_id']
            message_count = sess['msg_count']
            
            # Sub-query for first and last message content
            messages = ChatMessage.objects.filter(user=request.user, session_id=session_id).order_by('timestamp')
            first_message = messages.first()
            last_message = messages.last()
            
            if not last_message:
                continue
                
            session_data = {
                'id': session_id,
                'title': _generate_session_title(first_message),
                'message_count': message_count,
                'last_message': {
                    'content': last_message.content[:100] + '...' if len(last_message.content) > 100 else last_message.content,
                    'timestamp': last_message.timestamp.isoformat(),
                    'role': 'assistant' if last_message.message_type == 'ai' else 'user'
                },
                'created_at': first_message.timestamp.isoformat() if first_message else last_message.timestamp.isoformat(),
                'updated_at': last_message.timestamp.isoformat()
            }
            sessions_data.append(session_data)
        
        logger.debug(f"Found {len(sessions_data)} sessions for user {request.user.username}")
        
        return create_chat_response(
            success=True,
            data={'sessions': sessions_data},
            message="Sessions retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting user sessions: {str(e)}", exc_info=True)
        return create_chat_response(
            success=False,
            message="Internal server error while fetching sessions",
            status_code=500
        )


def _generate_session_title(first_message):
    """Generate a title for a session based on the first message"""
    if not first_message or first_message.message_type != 'user':
        return "محادثة جديدة"
    
    content = first_message.content.strip()
    if len(content) <= 30:
        return content
    else:
        return content[:30] + '...'


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_session(request, session_id):
    """Delete a chat session"""
    try:
        with transaction.atomic():
            # Delete all messages in session
            deleted_count, _ = ChatMessage.objects.filter(user=request.user, session_id=session_id).delete()

        return create_chat_response(
            success=True,
            message=f"Chat session deleted successfully. {deleted_count} messages removed."
        )
    except Exception as e:
        logger.error(f"Error deleting chat session: {str(e)}")
        return create_chat_response(
            success=False,
            message="Internal server error",
            status_code=500
        )
