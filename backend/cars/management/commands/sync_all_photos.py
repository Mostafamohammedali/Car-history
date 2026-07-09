from django.core.management.base import BaseCommand
from cars.models import Cars, ImageCar
from cars.car_service import VehicleDataService
import time
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'أمر مؤقت لجلب صور كافة السيارات التي ليس لها صور في قاعدة البيانات'

    def handle(self, *args, **options):
        # 1. البحث عن السيارات التي ليس لها أي صورة في جدول ImageCar
        cars_to_sync = Cars.objects.exclude(images__isnull=False)
        total = cars_to_sync.count()
        
        if total == 0:
            self.stdout.write(self.style.SUCCESS("✅ جميع السيارات لديها صور بالفعل! لا يوجد عمل للقيام به."))
            return

        self.stdout.write(self.style.MIGRATE_HEADING(f"🚀 تم العثور على {total} سيارة بدون صور. بدء عملية الجلب الشاملة..."))
        self.stdout.write(self.style.WARNING("⚠️  ملاحظة: هذه العملية قد تستغرق وقتاً طويلاً لتجنب حظر الـ API."))

        service = VehicleDataService()
        success_count = 0
        fail_count = 0

        for i, car in enumerate(cars_to_sync):
            progress = f"[{i+1}/{total}]"
            self.stdout.write(f"{progress} جاري جلب صور VIN: {car.vin} ...", ending="")
            
            try:
                # استدعاء الـ APIs النشطة (بما فيها API الصور)
                result = service.fetch_from_dynamic_api(car.vin)
                
                if result.get('fields'):
                    # تغليف البيانات لحفظها محلياً
                    wrapper = {
                        'success': True,
                        'vin': car.vin,
                        'data_sources': {'dynamic_api': result['fields']}
                    }
                    # حفظ البيانات (سيقوم بحفظ الصور في جدول ImageCar تلقائياً)
                    saved = service.save_external_data_to_local(car.vin, wrapper)
                    
                    if saved:
                        # التحقق هل أضيفت صور فعلاً؟
                        if ImageCar.objects.filter(car=car).exists():
                            self.stdout.write(self.style.SUCCESS(" ✓ تمت المزامنة"))
                            success_count += 1
                        else:
                            self.stdout.write(self.style.WARNING(" ⚠ لم يتم العثور على صور لهذا الـ VIN"))
                    else:
                        self.stdout.write(self.style.ERROR(" ✗ فشل الحفظ"))
                        fail_count += 1
                else:
                    self.stdout.write(self.style.WARNING(" ⚠ لا توجد بيانات في الـ API"))
                    fail_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f" ✗ خطأ: {str(e)}"))
                fail_count += 1

            # تأخير بسيط (ثانية واحدة) لتجنب الـ Rate Limit الخاص بالـ API
            time.sleep(1)

        self.stdout.write(self.style.MIGRATE_HEADING("\n🏁 اكتملت العملية الشاملة!"))
        self.stdout.write(self.style.SUCCESS(f"✅ نجاح: {success_count}"))
        self.stdout.write(self.style.ERROR(f"❌ فشل: {fail_count}"))
        self.stdout.write(self.style.WARNING("\nيمكنك الآن حذف هذا الملف (sync_all_photos.py) بأمان."))
