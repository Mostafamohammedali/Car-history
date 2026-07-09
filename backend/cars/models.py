"""

نماذج تطبيق السيارات



هذا الملف يحتوي على نماذج البيانات لتطبيق إدارة السيارات

يحدد هيكل قاعدة البيانات لتخزين معلومات السيارات

"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import base64
import os
import uuid
from django.db.models import Avg


class Cars(models.Model):
    """نموذج السيارات"""
    vin = models.CharField(primary_key=True, max_length=17, db_column='VIN', verbose_name='رقم الهيكل')
    name_car = models.CharField(max_length=255, verbose_name='اسم السيارة')
    make = models.CharField(max_length=100, verbose_name='الشركة المصنعة')
    model = models.CharField(max_length=100, verbose_name='الموديل')
    year = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2100)], verbose_name='سنة الصنع')
    color = models.CharField(max_length=50, verbose_name='اللون')
    seating_capacity = models.IntegerField(null=True, blank=True, verbose_name='عدد المقاعد')
    num_cylinders = models.IntegerField(null=True, blank=True, verbose_name='عدد الاسطوانات')
    fuel_type = models.CharField(max_length=50, choices=[('gasoline', 'بنزين'), ('diesel', 'ديزل'), ('electric', 'كهربائي'), ('hybrid', 'هجين'), ('other', 'أخرى')], verbose_name='نوع الوقود')
    engine_capacity = models.IntegerField(verbose_name='سعة المحرك (سم³)')
    gear_type = models.IntegerField(choices=[(1, 'عادي'), (2, 'أوتوماتيك')], verbose_name='نوع ناقل الحركة')
    customs_num = models.CharField(max_length=50, blank=True, null=True, verbose_name='رقم البيان الجمركي')
    customs_date = models.DateField(blank=True, null=True, verbose_name='تاريخ البيان الجمركي')
    receipt_number = models.CharField(max_length=50, blank=True, null=True, verbose_name='رقم الإيصال')
    receipt_date = models.DateField(blank=True, null=True, verbose_name='تاريخ الإيصال')
    mileage = models.IntegerField(default=0, verbose_name='المسافة المقطوعة')
    # حقول التتبع
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاريخ التحديث')
    
    class Meta:
        db_table = 'Cars'
        verbose_name = 'سيارة'
        verbose_name_plural = 'السيارات'
        indexes = [
            models.Index(fields=['vin']),
            models.Index(fields=['make', 'model']),
            models.Index(fields=['year']),
        ]
    
    def __str__(self):
        return f"{self.make} {self.model} ({self.year}) - VIN: {self.vin}"





class Reports(models.Model):
    # =========================================================================
    # 1. المعرفات والروابط الأساسية
    # =========================================================================
    report_id = models.AutoField(primary_key=True)
    
    # UUID للاستخدام في روابط React (أكثر أماناً من الـ ID العادي)
    report_uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    car = models.ForeignKey(
        'Cars', 
        on_delete=models.CASCADE, 
        related_name='reports',
        verbose_name='السيارة'
    )
    
    created_by = models.ForeignKey(
        'accounts.CustomUser', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_reports',
        verbose_name='أنشأ بواسطة'
    )

    # =========================================================================
    # 2. نتائج التحليل الذكي (AI Analysis)
    # =========================================================================
    
    # التقييم الرقمي الشامل (Overall AI Score) من 10
    overall_ai_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(10.0)],
        verbose_name='التقييم الرقمي الشامل'
    )
    
    # شدة الحادث (Severity Score) من 1 إلى 5
    accident_severity_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name='شدة الحادث'
    )
    
    # بيانات تحليل المخاطر والرسوم البيانية (JSON) - جاهزة لـ React
    risk_assessment_data = models.JSONField(
        default=dict, 
        blank=True, 
        verbose_name='بيانات تحليل المخاطر (Charts JSON)'
    )

    # =========================================================================
    # 3. بيانات اللقطة الثابتة (Snapshots) لضمان مصداقية التقرير
    # =========================================================================
    car_snapshot = models.JSONField(
        null=True, 
        blank=True, 
        verbose_name='نسخة بيانات السيارة وقت التقرير'
    )
    
    detailed_report = models.TextField(blank=True, null=True, verbose_name='التقرير المفصل')

    # =========================================================================
    # 5. حقول الإحصائيات (لتحسين أداء الواجهة)
    # =========================================================================
    total_images_count = models.PositiveIntegerField(default=0)
    total_accidents_count = models.PositiveIntegerField(default=0)
    avg_user_rating = models.FloatField(null=True, blank=True, verbose_name='متوسط تقييم المستخدمين')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإصدار')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاريخ التحديث')

    class Meta:
        db_table = 'Reports'
        verbose_name = 'تقرير شامل'
        verbose_name_plural = 'التقارير الشاملة'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['report_uuid']),
            models.Index(fields=['car']),
        ]

    def __str__(self):
        return f"Report {self.report_uuid} - {self.car.vin}"

    # =========================================================================
    # 6. منطق الحساب وبناء الرسوم البيانية (Business Logic)
    # =========================================================================
    
    def update_report_data(self):
        """الدالة المركزية لتجميع كافة البيانات وتحديث التقرير"""
        car_obj = self.car
        
        # 1. تحديث الإحصائيات من الجداول المرتبطة
        self.total_images_count = car_obj.images.count()
        self.total_accidents_count = car_obj.accident_images.count()
        
        # 2. حساب متوسط تقييم المستخدمين من جدول Evaluation
        evals = car_obj.evaluations.all()
        if evals.exists():
            self.avg_user_rating = evals.aggregate(Avg('rate'))['rate__avg']
        
        # 3. حفظ "لقطة" لبيانات السيارة الحالية (Snapshot)
        self.car_snapshot = {
            "vin": car_obj.vin,
            "make": car_obj.make,
            "model": car_obj.model,
            "year": car_obj.year,
            "mileage": car_obj.mileage,
            "fuel": car_obj.get_fuel_type_display() if hasattr(car_obj, 'get_fuel_type_display') else car_obj.fuel_type
        }

        # 4. تشغيل خوارزمية التحليل الذكي للرسوم البيانية
        self.calculate_ai_metrics()
        
        self.save()

    def calculate_ai_metrics(self):
        """حساب التقييم النهائي وتجهيز بيانات الـ Radar Chart لـ React"""
        
        # حساب الحالة التشغيلية بناءً على الممشى (100% للسيارة الجديدة وتتناقص)
        operational_health = max(25, 100 - (self.car.mileage // 4500))

        # Check if we already have a real AI evaluation in risk_assessment_data
        has_ai_eval = self.risk_assessment_data and "purchase_recommendation" in self.risk_assessment_data
        
        if not has_ai_eval:
            # خوارزمية حساب الـ Overall Score (من 10)
            base = 10.0
            # الخصومات (Penalties)
            penalty_accidents = self.accident_severity_score * 1.5
            penalty_mileage = max(0, (self.car.mileage - 80000) // 40000) * 0.4
            
            self.overall_ai_score = max(1.0, round(base - penalty_accidents - penalty_mileage, 1))

            self.risk_assessment_data = {
                "radar_chart": [
                    {"subject": "المحرك", "value": 85, "fullMark": 100},
                    {"subject": "الهيكل", "value": 100 - (self.accident_severity_score * 18), "fullMark": 100},
                    {"subject": "الأمان", "value": 90 - (self.total_accidents_count * 5), "fullMark": 100},
                    {"subject": "الإلكترونيات", "value": 85, "fullMark": 100},
                    {"subject": "الحالة التشغيلية", "value": operational_health, "fullMark": 100},
                ],
                "severity_info": {
                    "level": self.accident_severity_score,
                    "text": self.get_severity_display(),
                    "color": self.get_risk_color()
                }
            }
        else:
            # Preserve existing AI evaluation but update severity_info if needed
            if "severity_info" in self.risk_assessment_data:
                self.risk_assessment_data["severity_info"] = {
                    "level": self.accident_severity_score,
                    "text": self.get_severity_display(),
                    "color": self.get_risk_color()
                }

    def get_severity_display(self):
        labels = {0: "سليمة", 1: "ضرر طفيف", 2: "ضرر متوسط", 3: "ضرر واضح", 4: "ضرر جسيم", 5: "خسارة كلية"}
        return labels.get(self.accident_severity_score, "غير معروف")

    def get_risk_color(self):
        if self.overall_ai_score >= 8: return "#10b981" # أخضر (آمنة)
        if self.overall_ai_score >= 5: return "#f59e0b" # برتقالي (متوسطة)
        return "#ef4444" # أحمر (عالية المخاطر)





class Repairshops(models.Model):
    """نموذج بيانات الورش"""
    repairshop_id = models.AutoField(primary_key=True)
    car = models.ForeignKey(
        Cars,
        on_delete=models.CASCADE,
        related_name='repairshop_data',
        verbose_name='السيارة'
    )
    mech_insp_desc = models.TextField(blank=True, null=True, verbose_name='وصف الفحص الميكانيكي')
    comp_scan_desc = models.TextField(blank=True, null=True, verbose_name='وصف فحص الكمبيوتر')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاريخ التحديث')

    class Meta:
        db_table = 'repairshops'
        verbose_name = 'بيانات الورشة'
        verbose_name_plural = 'بيانات الورش'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['car', 'created_at']),
        ]
    def __str__(self):
        return f" {self.repairshop_id} - {self.car}"

class Evaluation(models.Model):
    """نموذج التقييم"""
    evaluation_id = models.AutoField(primary_key=True)
    car = models.ForeignKey(
        Cars,
        on_delete=models.CASCADE,
        related_name='evaluations',
        verbose_name='السيارة'
    )
    user = models.ForeignKey(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='car_evaluations',
        verbose_name='المستخدم'
    )
    rate = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name='التقييم'
    )
    comment = models.TextField(blank=True, null=True, verbose_name='تعليق')
    pros = models.TextField(blank=True, null=True, verbose_name='الإيجابيات')
    cons = models.TextField(blank=True, null=True, verbose_name='السلبيات')
    would_recommend = models.BooleanField(default=True, verbose_name='هل يوصي بها')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاريخ التحديث')

    class Meta:
        db_table = 'evaluation'
        verbose_name = 'تقييم'
        verbose_name_plural = 'التقييمات'
        ordering = ['-created_at']
        unique_together = ['car', 'user']
        indexes = [
            models.Index(fields=['car', 'rate']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f" {self.car} - {self.user.username} ({self.rate}/5)"

class ImageCar(models.Model):
    """نموذج صور السيارات"""
    img_car_id = models.AutoField(primary_key=True)
    car = models.ForeignKey(
        Cars,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='السيارة'
    )
    img_car = models.TextField(verbose_name='رابط صورة السيارة (Data URL)', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإضافة')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاريخ التحديث')

    class Meta:
        db_table = 'image_car'
        verbose_name = 'صورة سيارة'
        verbose_name_plural = 'صور السيارات'
        ordering = ['-img_car_id']
        indexes = [
            models.Index(fields=['car']),
        ]

    def __str__(self):
        return f"صورة سيارة {self.img_car_id}"

    def get_image_data_url(self):
        """
        إرجاع رابط صورة السيارة (Data URL) المخزن في قاعدة البيانات
        """
        return self.img_car

    def set_image_from_file(self, image_file):
        """
        تخزين بيانات الصورة من ملف مرفوع كـ Data URL
        """
        if image_file:
            try:
                import base64
                binary_data = image_file.read()
                ext = os.path.splitext(image_file.name)[1].lower().replace('.', '')
                mime = f"image/{ext}" if ext in ['png', 'gif', 'webp', 'bmp'] else "image/jpeg"
                encoded = base64.b64encode(binary_data).decode('utf-8')
                self.img_car = f"data:{mime};base64,{encoded}"
            except Exception as e:
                print(f"Error converting car image to data url: {e}")

class AccidentImage(models.Model):
    """نموذج صور حوادث السيارات"""
    accident_image_id = models.AutoField(primary_key=True)
    car = models.ForeignKey(
        Cars,
        on_delete=models.CASCADE,
        related_name='accident_images',
        verbose_name='السيارة'
    )
    accident_image = models.TextField(verbose_name='رابط صورة الحادث (Data URL)', null=True, blank=True)
    # التخزين فقط في قاعدة البيانات كروابط Data URL
    
    # AI Analysis Fields
    ai_description = models.TextField(blank=True, null=True, verbose_name='الوصف التلقائي بالذكاء الاصطناعي')
    ai_accident_type = models.CharField(
        max_length=20,
        choices=[
            ('front', 'اصطدام أمامي'),
            ('rear', 'اصطدام خلفي'),
            ('side', 'اصطدام جانبي'),
            ('rollover', 'انقلاب'),
            ('minor', 'حادث بسيط'),
            ('major', 'حادث كبير'),
            ('other', 'أخرى')
        ],
        blank=True,
        null=True,
        verbose_name='نوع الحادث (تحليل الذكاء الاصطناعي)'
    )
    ai_analysis_data = models.JSONField(default=dict, blank=True, null=True, verbose_name='بيانات تحليل الذكاء الاصطناعي')
    ai_confidence_score = models.FloatField(
        blank=True, 
        null=True, 
        verbose_name='درجة ثقة التحليل',
        help_text='درجة ثقة الذكاء الاصطناعي في التحليل (0-1)'
    )
    ai_analyzed_at = models.DateTimeField(
        blank=True, 
        null=True, 
        verbose_name='تاريخ تحليل الذكاء الاصطناعي'
    )
    ai_analysis_enabled = models.BooleanField(
        default=True, 
        verbose_name='تفعيل تحليل الذكاء الاصطناعي'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإنشاء')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاريخ التحديث')
    
    class Meta:
        db_table = 'accident_images'
        verbose_name = 'صورة حادث'
        verbose_name_plural = 'صور الحوادث'
        ordering = ['-accident_image_id']
        indexes = [
            models.Index(fields=['car']),
            models.Index(fields=['ai_analyzed_at']),
            models.Index(fields=['ai_confidence_score']),
        ]
    
    def __str__(self):
        return f"صورة حادث {self.accident_image_id} - {self.car}"
    
    def get_image_data_url(self):
        """
        إرجاع رابط صورة الحادث (Data URL) المخزن في قاعدة البيانات
        """
        return self.accident_image
    
    def set_image_from_file(self, image_file):
        """
        تخزين بيانات الصورة من ملف مرفوع كـ Data URL
        """
        if image_file:
            try:
                import base64
                binary_data = image_file.read()
                # تحديد نوع الملف بشكل بسيط
                ext = os.path.splitext(image_file.name)[1].lower().replace('.', '')
                mime = f"image/{ext}" if ext in ['png', 'gif', 'webp', 'bmp'] else "image/jpeg"
                
                encoded = base64.b64encode(binary_data).decode('utf-8')
                self.accident_image = f"data:{mime};base64,{encoded}"
            except Exception as e:
                print(f"Error converting uploaded file to data url: {e}")
    
    def set_image_from_path(self, image_path):
        """
        تخزين بيانات الصورة من مسار ملف كـ Data URL
        """
        try:
            import base64
            with open(image_path, 'rb') as f:
                binary_data = f.read()
                ext = os.path.splitext(image_path)[1].lower().replace('.', '')
                mime = f"image/{ext}" if ext in ['png', 'gif', 'webp', 'bmp'] else "image/jpeg"
                
                encoded = base64.b64encode(binary_data).decode('utf-8')
                self.accident_image = f"data:{mime};base64,{encoded}"
        except Exception as e:
            print(f"Error loading image from {image_path}: {e}")
    
    def save(self, *args, **kwargs):
        """
        تجاوز دالة الحفظ للتعامل مع رفع الصور وتخزينها مباشرة في قاعدة البيانات
        """
        super().save(*args, **kwargs)

class ContactMessage(models.Model):
    """نموذج رسائل الاتصال"""
    message_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, verbose_name='الاسم')
    email = models.EmailField(verbose_name='البريد الإلكتروني')
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='رقم الهاتف')
    subject = models.CharField(
        max_length=50,
        choices=[
            ('general', 'استفسار عام'),
            ('support', 'دعم فني'),
            ('complaint', 'شكوى'),
            ('suggestion', 'اقتراح أو ملاحظة'),
            ('other', 'أخرى')
        ],
        default='general',
        verbose_name='الموضوع'
    )
    message = models.TextField(verbose_name='الرسالة')
    vin = models.CharField(max_length=17, blank=True, null=True, verbose_name='رقم الهيكل')
    urgent = models.BooleanField(default=False, verbose_name='عاجل')
    is_read = models.BooleanField(default=False, verbose_name='تم القراءة')
    reference_number = models.CharField(max_length=20, blank=True, null=True, unique=True, verbose_name='رقم المرجع')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاريخ الإرسال')
    
    class Meta:
        db_table = 'ContactMessages'
        verbose_name = 'رسالة اتصال'
        verbose_name_plural = 'رسائل الاتصال'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_read', 'created_at']),
            models.Index(fields=['subject']),
            models.Index(fields=['reference_number']),
        ]
    
    def __str__(self):
        return f"رسالة من {self.name} - {self.subject}"


