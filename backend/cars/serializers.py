from rest_framework import serializers
from django.db import models
from accounts.serializers import CustomUserSerializer
from .models import (
    Cars, Reports, Repairshops, Evaluation, ImageCar, 
    ContactMessage, AccidentImage
)


class CarsSerializer(serializers.ModelSerializer):
    """Serializer for Cars model"""
    
    class Meta:
        model = Cars
        fields = [
            'vin', 'name_car', 'make', 'model', 'year', 'color',
            'seating_capacity', 'num_cylinders', 'fuel_type',
            'engine_capacity', 'gear_type', 'customs_num', 'customs_date',
            'receipt_number', 'receipt_date', 'mileage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_vin(self, value):
        """Validate VIN format - supports international VIN standards"""
        if not value:
            raise serializers.ValidationError("VIN is required")
        
        # Clean VIN - remove spaces and convert to uppercase
        vin_clean = value.strip().upper().replace(' ', '')
        
        # Support multiple VIN length standards
        # Standard VIN: 17 characters (most common worldwide)
        # Some older/unique vehicles may have different lengths
        if len(vin_clean) < 5 or len(vin_clean) > 25:
            raise serializers.ValidationError("VIN length must be between 5 and 25 characters")
        
        # Allow all alphanumeric characters except I, O, Q in standard positions
        # But be more flexible for international standards
        invalid_chars = ['I', 'O', 'Q']
        
        # For standard 17-character VINs, be stricter
        if len(vin_clean) == 17:
            for char in invalid_chars:
                if char in vin_clean:
                    raise serializers.ValidationError(f"Standard 17-character VIN cannot contain '{char}'")
        
        # For non-standard VINs, be more flexible but still validate basic format
        elif len(vin_clean) > 17:
            # For longer VINs, only check for obviously invalid characters
            if not all(c.isalnum() or c in '-._' for c in vin_clean):
                raise serializers.ValidationError("VIN contains invalid characters")
        
        # Ensure we have at least some alphanumeric characters
        if not any(c.isalnum() for c in vin_clean):
            raise serializers.ValidationError("VIN must contain alphanumeric characters")
        
        return vin_clean


class EvaluationSerializer(serializers.ModelSerializer):
    """Serializer for Evaluation model"""
    car = CarsSerializer(read_only=True)
    user = CustomUserSerializer(read_only=True)
    
    class Meta:
        model = Evaluation
        fields = [
            'evaluation_id', 'car', 'user', 'rate', 'would_recommend',
            'comment', 'pros', 'cons', 'created_at', 'updated_at'
        ]
        read_only_fields = ['evaluation_id', 'created_at', 'updated_at']


class ReportsSerializer(serializers.ModelSerializer):
    """Serializer for Reports model - Updated for new AI structure"""
    car = CarsSerializer(read_only=True)
    created_by = CustomUserSerializer(read_only=True)
    
    class Meta:
        model = Reports
        fields = [
            'report_id', 'report_uuid', 'car', 'created_by',
            'overall_ai_score', 'accident_severity_score', 'risk_assessment_data',
            'car_snapshot', 'detailed_report',
            'total_images_count', 'total_accidents_count', 'avg_user_rating',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'report_id', 'report_uuid', 'overall_ai_score', 'accident_severity_score',
            'risk_assessment_data', 'car_snapshot', 'detailed_report',
            'total_images_count', 'total_accidents_count',
            'avg_user_rating', 'created_at', 'updated_at'
        ]


class ReportsCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Reports"""
    
    class Meta:
        model = Reports
        fields = ['car']


class RepairshopsSerializer(serializers.ModelSerializer):
    """Serializer for Repairshops model"""
    car = CarsSerializer(read_only=True)
    
    class Meta:
        model = Repairshops
        fields = [
            'repairshop_id', 'car', 'mech_insp_desc', 'comp_scan_desc',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['repairshop_id', 'created_at', 'updated_at']


class ImageCarSerializer(serializers.ModelSerializer):
    """Serializer for ImageCar model"""
    car = CarsSerializer(read_only=True)
    image_data_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ImageCar
        fields = [
            'img_car_id', 'car', 'img_car', 'image_data_url', 'created_at'
        ]
        read_only_fields = ['img_car_id', 'created_at']
    
    def get_image_data_url(self, obj):
        return obj.get_image_data_url()


class AccidentImageSerializer(serializers.ModelSerializer):
    """Serializer for AccidentImage model"""
    car = CarsSerializer(read_only=True)
    accident_image_data_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AccidentImage
        fields = [
            'accident_image_id', 'car', 'accident_image', 'ai_analysis_enabled',
            'ai_analyzed_at', 'ai_confidence_score', 'ai_description',
            'ai_accident_type', 'ai_analysis_data', 'accident_image_data_url',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'accident_image_id', 'ai_analyzed_at', 'ai_confidence_score',
            'ai_description', 'ai_accident_type', 'ai_analysis_data',
            'created_at', 'updated_at'
        ]
    
    def get_accident_image_data_url(self, obj):
        return obj.get_image_data_url()


class CarsListSerializer(serializers.ModelSerializer):
    """Serializer for Cars list view"""
    
    class Meta:
        model = Cars
        fields = [
            'vin', 'name_car', 'make', 'model', 'year', 'color',
            'fuel_type', 'gear_type', 'mileage', 'created_at'
        ]


class CarDetailSerializer(CarsSerializer):
    """Serializer for Car details with related data - Updated for new Reports model"""
    evaluations = EvaluationSerializer(many=True, read_only=True)
    images = ImageCarSerializer(many=True, read_only=True)
    accident_images = AccidentImageSerializer(many=True, read_only=True)
    reports = ReportsSerializer(many=True, read_only=True)
    repairshops = RepairshopsSerializer(many=True, read_only=True)
    latest_report = serializers.SerializerMethodField()
    car_statistics = serializers.SerializerMethodField()
    
    class Meta(CarsSerializer.Meta):
        fields = CarsSerializer.Meta.fields + [
            'evaluations', 'images', 'accident_images', 'reports', 
            'repairshops', 'latest_report', 'car_statistics'
        ]
    
    def get_latest_report(self, obj):
        """Get the latest report for this car"""
        latest_report = obj.reports.order_by('-created_at').first()
        if latest_report:
            # Update statistics before returning
            latest_report.update_statistics()
            return ReportsSerializer(latest_report).data
        return None
    
    def get_car_statistics(self, obj):
        """Get comprehensive statistics for this car"""
        return {
            'total_images': obj.images.count(),
            'total_accident_images': obj.accident_images.count(),
            'total_evaluations': obj.evaluations.count(),
            'has_repairshops_data': obj.repairshop_data.exists(),
            'avg_rating': obj.evaluations.aggregate(models.Avg('rate'))['rate__avg'],
            'total_reports': obj.reports.count(),
            'latest_report_date': obj.reports.order_by('-created_at').first().created_at.isoformat() if obj.reports.exists() else None
        }


class CarSearchSerializer(serializers.Serializer):
    """Serializer for car search validation - supports international VIN standards"""
    vin = serializers.CharField(max_length=25, min_length=5)
    
    def validate_vin(self, value):
        """Validate VIN format - supports international VIN standards"""
        if not value:
            raise serializers.ValidationError("VIN is required")
        
        # Clean VIN - remove spaces and convert to uppercase
        vin_clean = value.strip().upper().replace(' ', '')
        
        # Support multiple VIN length standards
        # Standard VIN: 17 characters (most common worldwide)
        # Some older/unique vehicles may have different lengths
        if len(vin_clean) < 5 or len(vin_clean) > 25:
            raise serializers.ValidationError("VIN length must be between 5 and 25 characters")
        
        # Allow all alphanumeric characters except I, O, Q in standard positions
        # But be more flexible for international standards
        invalid_chars = ['I', 'O', 'Q']
        
        # For standard 17-character VINs, be stricter
        if len(vin_clean) == 17:
            for char in invalid_chars:
                if char in vin_clean:
                    raise serializers.ValidationError(f"Standard 17-character VIN cannot contain '{char}'")
        
        # For non-standard VINs, be more flexible but still validate basic format
        elif len(vin_clean) > 17:
            # For longer VINs, only check for obviously invalid characters
            if not all(c.isalnum() or c in '-._' for c in vin_clean):
                raise serializers.ValidationError("VIN contains invalid characters")
        
        # Ensure we have at least some alphanumeric characters
        if not any(c.isalnum() for c in vin_clean):
            raise serializers.ValidationError("VIN must contain alphanumeric characters")
        
        return vin_clean


class EvaluationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Evaluation"""
    
    class Meta:
        model = Evaluation
        fields = [
            'car', 'rate', 'would_recommend', 'comment', 'pros', 'cons'
        ]
    
    def validate_rate(self, value):
        """Validate rating is between 1 and 5"""
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value




class ContactMessageSerializer(serializers.ModelSerializer):
    """Serializer for ContactMessage model"""
    
    class Meta:
        model = ContactMessage
        fields = [
            'message_id', 'name', 'email', 'phone', 'subject', 'message',
            'vin', 'urgent', 'is_read', 'reference_number', 'created_at'
        ]
        read_only_fields = ['message_id', 'created_at', 'reference_number']




class ReportStatisticsSerializer(serializers.Serializer):
    """Serializer for report statistics without full report data"""
    report_id = serializers.IntegerField(read_only=True)
    vin = serializers.CharField(max_length=17)
    statistics = serializers.DictField(read_only=True)
    rating = serializers.CharField(read_only=True)
    import_type = serializers.CharField(read_only=True)
    verified = serializers.BooleanField(read_only=True)
    data_completeness = serializers.FloatField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)




class CarImageSerializer(serializers.ModelSerializer):
    """Enhanced serializer for Car images"""
    image_data_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ImageCar
        fields = [
            'img_car_id', 'image_data_url', 'created_at'
        ]
        read_only_fields = ['img_car_id', 'created_at']
    
    def get_image_data_url(self, obj):
        return obj.get_image_data_url()


class AccidentImageDetailSerializer(serializers.ModelSerializer):
    """Enhanced serializer for Accident images with AI analysis"""
    accident_image_data_url = serializers.SerializerMethodField()
    ai_analysis_complete = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = AccidentImage
        fields = [
            'accident_image_id', 'accident_image_data_url', 'ai_analysis_enabled',
            'ai_analyzed_at', 'ai_confidence_score', 'ai_description',
            'ai_accident_type', 'ai_analysis_data', 'ai_analysis_complete',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'accident_image_id', 'ai_analyzed_at', 'ai_confidence_score',
            'ai_description', 'ai_accident_type', 'ai_analysis_data',
            'ai_analysis_complete', 'created_at', 'updated_at'
        ]
    
    def get_accident_image_data_url(self, obj):
        return obj.get_image_data_url()


class EvaluationDetailSerializer(serializers.ModelSerializer):
    """Enhanced serializer for Evaluation with pros and cons"""
    car = CarsSerializer(read_only=True)
    user = CustomUserSerializer(read_only=True)
    
    class Meta:
        model = Evaluation
        fields = [
            'evaluation_id', 'car', 'user', 'rate', 'would_recommend',
            'comment', 'pros', 'cons', 'created_at', 'updated_at'
        ]
        read_only_fields = ['evaluation_id', 'created_at', 'updated_at']
