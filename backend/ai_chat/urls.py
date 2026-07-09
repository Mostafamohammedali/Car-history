from django.urls import path
from rest_framework.urlpatterns import format_suffix_patterns
from . import views

app_name = 'ai_chat'

urlpatterns = [
    # Chat endpoints
    path('send_message/', views.send_message, name='send_message'),
    path('history/<str:session_id>/', views.get_chat_history, name='get_chat_history'),
    path('sessions/', views.get_user_sessions, name='get_user_sessions'),
    path('messages/<str:session_id>/', views.get_session_messages, name='get_session_messages'),
    path('session/<str:session_id>/', views.delete_session, name='delete_session'),
    # Car analysis endpoint
    path('analyze_car/', views.analyze_car, name='analyze_car'),
]

urlpatterns = format_suffix_patterns(urlpatterns)

