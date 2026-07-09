from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns
from . import views

app_name = 'cars'
urlpatterns = [
    # Main API endpoints using Reports model only
    path('search/', views.search_car, name='api_search_car'),
    path('complete-report/<str:vin>/', views.get_complete_report, name='api_get_complete_report'),
    path('contact/', views.contact, name='api_contact'),
    path('report/<uuid:report_uuid>/', views.get_report_by_uuid, name='api_get_report_by_uuid'),
    path('user-stats/', views.get_user_stats, name='api_get_user_stats'),
    
    # Report management endpoints
    path('report/create/<str:vin>/', views.create_or_update_report, name='api_create_or_update_report'),
    path('report/statistics/<str:vin>/', views.get_report_statistics, name='api_get_report_statistics'),
    
    # VIN Search endpoints - VehicleDataService integration
    path('vin-validate/', views.vin_validate_view, name='vin-validate'),

    # Integrated VIN Search (Main Workflow: Local -> External -> Decoding -> Report)
    path('integrated-search/', views.integrated_vin_search_view, name='integrated-vin-search'),

    # VIN Decoding endpoints (standalone)
    path('vin-decode/', views.vin_decode_view, name='vin-decode'),
    path('vin-batch-decode/', views.vin_batch_decode_view, name='vin-batch-decode'),
    path('vin-supported-manufacturers/', views.vin_supported_manufacturers_view, name='vin-supported-manufacturers'),
    
    # Evaluation / User Feedback
    path('evaluation/create/', views.create_evaluation, name='api_create_evaluation'),
    path('evaluation/delete/<int:evaluation_id>/', views.delete_evaluation, name='api_delete_evaluation'),
    
    # Public platform endpoints (no authentication required)
    path('platform-stats/', views.platform_stats, name='api_platform_stats'),
    path('recent-cars/', views.recent_cars, name='api_recent_cars'),
    
    # تحديث بيانات السيارة الأساسية (الممشى والموديل)
    path('car/<str:vin>/update-core/', views.update_car_core_data, name='api_update_car_core_data'),
]

urlpatterns = format_suffix_patterns(urlpatterns)
