from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Cars, Reports, Repairshops, Evaluation, 
    ImageCar, ContactMessage, AccidentImage
)


class ReportsInline(admin.TabularInline):
    model = Reports
    extra = 0
    verbose_name = "Car Report"
    verbose_name_plural = "Car Reports"

class RepairshopsInline(admin.TabularInline):
    model = Repairshops
    extra = 0
    verbose_name = "Repair Log"
    verbose_name_plural = "Repair Logs"

class ImageCarInline(admin.TabularInline):
    model = ImageCar
    extra = 0
    fields = ('image_preview',)
    readonly_fields = ('image_preview',)
    verbose_name = "Car Image"
    verbose_name_plural = "Car Images"
    
    def image_preview(self, obj):
        if obj.img_car:
            return format_html('<img src="{}" width="100" height="100" style="object-fit:cover;"/>', obj.get_image_data_url())
        return "-"

class AccidentImageInline(admin.TabularInline):
    model = AccidentImage
    extra = 0
    fields = ('image_preview', 'ai_analysis_status', 'ai_description')
    readonly_fields = ('image_preview', 'ai_analysis_status')
    verbose_name = "Accident Image"
    verbose_name_plural = "Accident Images"

    def image_preview(self, obj):
        if obj.accident_image:
            return format_html('<img src="{}" width="100" height="100" style="object-fit:cover; border:2px solid #dc3545;"/>', obj.get_image_data_url())
        return "-"
    
    def ai_analysis_status(self, obj):
        if obj.ai_analyzed_at:
            return format_html('<span style="color:green;">✓ Analyzed</span>')
        return format_html('<span style="color:orange;">Pending</span>')

@admin.register(Cars)
class CarsAdmin(admin.ModelAdmin):
    inlines = [ReportsInline, RepairshopsInline, ImageCarInline, AccidentImageInline]
    list_display = (
        'vin', 'name_car', 'make', 'model', 'year', 'fuel_type', 'gear_type',
        'created_at'
    )
    list_filter = ('make', 'model', 'year', 'fuel_type', 'gear_type', 'created_at')
    search_fields = ('vin', 'name_car', 'make', 'model', 'customs_num', 'receipt_number')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Basic Information', {
            'fields': ('vin', 'name_car', 'make', 'model', 'year', 'color', 'mileage')
        }),
        ('Technical Specifications', {
            'fields': (
                'engine_capacity', 'num_cylinders', 
                'fuel_type', 'gear_type', 'seating_capacity'
            )
        }),
        ('Documentation (Customs & Receipts)', {
            'fields': ('customs_num', 'customs_date', 'receipt_number', 'receipt_date')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
        }),
    )



@admin.register(Reports)
class ReportsAdmin(admin.ModelAdmin):
    list_display = ('report_id', 'car', 'overall_ai_score', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('car__vin', 'car__name_car')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'report_uuid')


@admin.register(Repairshops)
class RepairshopsAdmin(admin.ModelAdmin):
    list_display = ('repairshop_id', 'car', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('car__vin', 'car__name_car')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ('evaluation_id', 'car', 'user', 'rate', 'would_recommend', 'created_at')
    list_filter = ('rate', 'would_recommend', 'created_at')
    search_fields = ('car__vin', 'car__name_car', 'user__username', 'comment')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ImageCar)
class ImageCarAdmin(admin.ModelAdmin):
    list_display = ('img_car_id', 'car', 'image_preview')
    search_fields = ('car__vin', 'car__name_car')
    ordering = ('-img_car_id',)
    readonly_fields = ('img_car_id', 'img_car', 'image_preview')
    fields = (
        'car', 
        'image_preview'
    )

    def image_preview(self, obj):
        if obj.img_car:
            return format_html(
                '<img src="{}" width="100" height="100" style="object-fit: cover; border: 1px solid #ddd;" />', 
                obj.get_image_data_url()
            )
        return '<span style="color: #999;">No image</span>'
    image_preview.short_description = 'Image Preview'
    image_preview.allow_tags = True

    def save_model(self, request, obj, form, change):
        # Save the object
        super().save_model(request, obj, form, change)


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('message_id', 'name', 'email', 'subject', 'is_read', 'created_at')
    list_filter = ('subject', 'is_read', 'created_at')
    search_fields = ('name', 'email', 'message')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)


@admin.register(AccidentImage)
class AccidentImageAdmin(admin.ModelAdmin):
    list_display = ('accident_image_id', 'car', 'ai_analysis_status', 'image_preview')
    list_filter = ('ai_analyzed_at',)
    search_fields = ('car__vin', 'car__name_car', 'ai_description')
    ordering = ('-accident_image_id',)
    readonly_fields = ('accident_image_id', 'ai_analyzed_at', 'image_preview', 'ai_analysis_summary', 'ai_confidence_score', 'accident_image')
    fields = (
        'car',
        'ai_analysis_enabled',
        'image_preview', 
        'ai_analysis_summary', 
        'ai_analyzed_at', 
        'ai_confidence_score',
        'ai_description', 
        'ai_accident_type', 
        'ai_analysis_data'
    )

    def ai_analysis_status(self, obj):
        """Display AI analysis status"""
        if not obj.ai_analysis_enabled:
            return '<span class="badge bg-secondary">Disabled</span>'
        elif obj.ai_analyzed_at:
            if obj.ai_confidence_score and obj.ai_confidence_score > 0.7:
                return '<span class="badge bg-success">Analyzed</span>'
            else:
                return '<span class="badge bg-warning">Analyzed (Low Confidence)</span>'
        else:
            return '<span class="badge bg-info">Pending</span>'
    ai_analysis_status.short_description = 'Analysis Status'
    ai_analysis_status.allow_tags = True

    def image_preview(self, obj):
        if obj.accident_image:
            return format_html(
                '<img src="{}" width="100" height="100" style="object-fit: cover; border: 2px solid #dc3545;" />', 
                obj.get_image_data_url()
            )
        return '<span style="color: #999;">No image</span>'
    image_preview.short_description = 'Accident Image Preview'
    image_preview.allow_tags = True

    def save_model(self, request, obj, form, change):
        if hasattr(obj, 'uploaded_by'):
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)
        
        # Confirmation message after uploading image
        if obj.accident_image and not change:
            self.message_user(request, "Accident image uploaded and stored successfully in database", level='success')
        elif obj.accident_image and change:
            self.message_user(request, "Accident image updated successfully in database", level='success')

    def ai_analysis_summary(self, obj):
        """Display AI analysis summary"""
        if not obj.ai_description:
            return '<span class="text-muted">Not analyzed yet</span>'
        else:
            return format_html('<small>{}</small>', obj.ai_description[:100] + '...' if len(obj.ai_description) > 100 else obj.ai_description)
    ai_analysis_summary.short_description = 'Analysis Summary'
    ai_analysis_summary.allow_tags = True

    def get_readonly_fields(self, request, obj=None):
        """Customize readonly fields"""
        readonly = list(self.readonly_fields)
        if obj and obj.ai_analyzed_at:
            # If analyzed, make AI fields readonly
            readonly.extend(['ai_description', 'ai_accident_type', 'ai_analysis_data'])
        return readonly


# تخصيص مظهر واجهة الإدارة
admin.site.site_header = "إدارة سجل السيارات"
admin.site.site_title = "لوحة تحكم سجل السيارات"
admin.site.index_title = "مرحباً بك في لوحة تحكم سجل السيارات"
