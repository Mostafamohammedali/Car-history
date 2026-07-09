from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from cars import views as cars_views

urlpatterns = [
    path('admin/', admin.site.urls) ,
    # API routes for React frontend
    path('api/accounts/', include('accounts.urls', namespace='accounts')),
    path('api/cars/', include('cars.urls', namespace='cars')),
    path('api/chat/', include('ai_chat.urls', namespace='ai_chat')),
    
    # Route for VIN decoding (Python implementation with CarDog + vininfo)
    path('api/vin-decoder/decode/', cars_views.vin_decode_view, name='vin_decode'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) \
  + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)