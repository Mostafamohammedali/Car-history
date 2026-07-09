"""
AutomotiveAIAssistant - Comprehensive AI Service
=================================================
Handles:
1. Smart chat with full context awareness
2. Deep car analysis (images + data + web knowledge)
3. Accident image analysis with damage detection
4. Full report generation saved to Reports table
"""

from groq import Groq
from django.conf import settings
from django.utils import timezone
import uuid, base64, os, io, json, logging
from PIL import Image

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Helper: safe JSON extraction from LLM output
# ─────────────────────────────────────────────
def _extract_json(text: str) -> dict:
    """Try to parse JSON from LLM response, stripping markdown fences."""
    text = text.strip()
    
    # إزالة علامات Markdown إذا كانت موجودة
    if "```" in text:
        import re
        match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
        if match:
            text = match.group(1).strip()
        else:
            text = text.replace("```json", "").replace("```", "").strip()
            
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON Decode Error: {e} - Attempting regex extraction.")
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception as e2:
                logger.error(f"Fallback JSON extraction failed: {e2}")
                pass
    except Exception as e:
        logger.error(f"Unexpected error in JSON extraction: {e}")
        
    return {}


class AutomotiveAIAssistant:
    """
    Central AI assistant for Car History platform.
    Uses Groq API (llama-3.3-70b-versatile for text, llava for vision).
    """

    CHAT_MODEL = "llama-3.1-8b-instant"
    VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)


    # ══════════════════════════════════════════════════════════════════
    # 1. SMART CHAT
    # ══════════════════════════════════════════════════════════════════

    def _base_system_prompt(self) -> str:
        return """أنت مساعد ذكاء اصطناعي متخصص ومتقدم جداً لمنصة Car History.
لديك خبرة عميقة في:
- تحليل تاريخ السيارات وتقارير VIN
- ميكانيكا السيارات والأنظمة الهندسية (محرك، ناقل حركة، فرامل، تعليق)
- تقييم الأضرار وتكاليف الإصلاح في السوق السعودي واليمني
- أسعار السيارات المستعملة وعوامل الاستهلاك
- الأعطال الشائعة لكل موديل وسنة صنع
- قوانين السلامة والمعايير الدولية

فريق التطوير:
- المشرف: المهندس مصطفى محمد
- المطورون: زياد الشرعبي، بندر سالم، رامي الشيخ

قواعد التواصل:
- يجب أن تتحدث دائماً بنفس اللغة التي استخدمها المستخدم (إذا تحدث بالعربية، أجب بالعربية. إذا تحدث بالإنجليزية، أجب بالإنجليزية).
- كن دقيقاً، احترافياً، ومنظماً في ردودك.
- استخدم العناوين والقوائم لتنظيم المعلومات بشكل جميل.
- لا تتردد في ذكر حدود معرفتك عند الحاجة.
- ركز على الفائدة العملية للمستخدم."""

    def get_response(self, user_message: str, session_id: str = None,
                     car_context: dict = None) -> dict:
        """
        Smart chat response with optional car context injection.
        car_context: dict with car data to give the AI full awareness of the car being discussed.
        """
        try:
            is_arabic = any('\u0600' <= c <= '\u06FF' for c in user_message)
            system = self._base_system_prompt()

            # Inject car context if provided
            if car_context:
                system += self._build_car_context_prompt(car_context)

            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user_message}
            ]

            resp = self.client.chat.completions.create(
                model=self.CHAT_MODEL,
                messages=messages,
                temperature=0.5,
                max_tokens=1024
            )

            return {
                "response": resp.choices[0].message.content,
                "session_id": session_id or str(uuid.uuid4()),
                "language": "ar" if is_arabic else "en"
            }

        except Exception as e:
            return self._handle_error(e)

    def _build_car_context_prompt(self, ctx: dict) -> str:
        """Build a context block injected into system prompt."""
        lines = ["\n\n--- سياق السيارة الحالية ---"]
        car = ctx.get("car", {})
        if car:
            lines.append(f"السيارة: {car.get('make','')} {car.get('model','')} {car.get('year','')}")
            lines.append(f"VIN: {car.get('vin','')}")
            lines.append(f"الممشى: {car.get('mileage', 0):,} كم")
            lines.append(f"نوع الوقود: {car.get('fuel_type','')}")
            lines.append(f"ناقل الحركة: {car.get('gear_type','')}")

        stats = ctx.get("statistics", {})
        if stats:
            lines.append(f"عدد صور الحوادث: {stats.get('total_accident_images', 0)}")
            lines.append(f"متوسط تقييم المستخدمين: {stats.get('avg_user_rating', 0):.1f}/5")
            lines.append(f"يوجد فحص ورشة: {'نعم' if stats.get('has_repairshops_data') else 'لا'}")


        lines.append("--- نهاية السياق ---\n")
        return "\n".join(lines)


    # ══════════════════════════════════════════════════════════════════
    # 2. ACCIDENT IMAGE ANALYSIS
    # ══════════════════════════════════════════════════════════════════

    def analyze_accident_image(self, image_bytes: bytes) -> dict:
        """
        Analyze a single accident image using vision model.
        Returns structured damage assessment.
        """
        try:
            # Resize to reduce payload
            img = Image.open(io.BytesIO(image_bytes))
            img.thumbnail((1024, 768))
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            b64 = base64.b64encode(buf.getvalue()).decode()

            prompt = """أنت خبير تقييم حوادث سيارات معتمد ودقيق جداً. حلل هذه الصورة بعناية شديدة.

قواعد التصنيف الإلزامية:
- severity_score = 0: سليمة تماماً (لا يوجد أي ضرر)
- severity_score = 1: بسيط (خدش سطحي، خبطة خفيفة، لا يؤثر على الهيكل أو السلامة)
- severity_score = 2: بسيط إلى متوسط (تلف بسيط في جزء واحد قابل للاستبدال)
- severity_score = 3: متوسط (تلف واضح في أكثر من جزء، تشوه في الهيكل الخارجي)
- severity_score = 4: شديد (تلف هيكلي واضح، تأثير على الشاسيه أو أعمدة السيارة، أضرار جوهرية)
- severity_score = 5: كلي (خسارة كلية، السيارة غير قابلة للإصلاح الاقتصادي)

أعطني JSON بالشكل التالي بدون أي نص إضافي:
{
  "accident_type": "أمامي|خلفي|جانبي|انقلاب|خدش|أخرى",
  "severity_score": 0,
  "severity_label": "سليمة|بسيط|متوسط|شديد|كلي",
  "damaged_parts": ["قائمة الأجزاء التالفة بالتفصيل"],
  "damage_description": "وصف تفصيلي ودقيق للضرر يشمل: المنطقة المتضررة، عمق الضرر، هل يوجد تشوه هيكلي",
  "repair_cost_min": 0,
  "repair_cost_max": 0,
  "is_drivable": true,
  "structural_damage": false,
  "confidence": 0.0
}
repair_cost بالريال السعودي. كن دقيقاً جداً في severity_score."""

            resp = self.client.chat.completions.create(
                model=self.VISION_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {
                            "url": f"data:image/jpeg;base64,{b64}"
                        }}
                    ]
                }],
                temperature=0.1,
                max_tokens=800,
                response_format={"type": "json_object"}
            )

            result = _extract_json(resp.choices[0].message.content)
            if not result:
                result = {
                    "accident_type": "غير محدد",
                    "severity_score": 0,
                    "severity_label": "غير محدد",
                    "damaged_parts": [],
                    "damage_description": resp.choices[0].message.content[:500],
                    "repair_cost_min": 0,
                    "repair_cost_max": 0,
                    "is_drivable": True,
                    "structural_damage": False,
                    "confidence": 0.3
                }
            return {"success": True, "analysis": result}

        except Exception as e:
            logger.error(f"Image analysis error: {e}")
            return {"success": False, "error": str(e), "analysis": {}}

    def analyze_all_accident_images(self, car_vin: str) -> dict:
        """
        Fetch and analyze ALL accident images for a car from the database.
        Returns aggregated damage report.
        """
        try:
            from cars.models import AccidentImage
            images = AccidentImage.objects.filter(car__vin=car_vin)

            if not images.exists():
                return {"success": True, "images_analyzed": 0, "analyses": [],
                        "aggregate": {"max_severity": 0, "total_cost_min": 0,
                                      "total_cost_max": 0, "all_damaged_parts": []}}

            analyses = []
            for img_obj in images:
                # Skip Groq API if already analyzed successfully, just use existing data
                if img_obj.ai_analyzed_at and img_obj.ai_analysis_data and "error" not in img_obj.ai_analysis_data:
                    analyses.append(img_obj.ai_analysis_data)
                    continue

                raw = img_obj.accident_image
                if raw is None:
                    continue
                
                # Convert string (Data URL, base64, or HTTP URL) to bytes
                if isinstance(raw, str):
                    import base64
                    import requests
                    if raw.startswith("data:image"):
                        try:
                            b64_str = raw.split(",")[1]
                            raw = base64.b64decode(b64_str)
                        except Exception as e:
                            logger.error(f"Failed to decode data URL for image ID {img_obj.accident_image_id}: {e}")
                            continue
                    elif raw.startswith("http://") or raw.startswith("https://"):
                        try:
                            headers = {'User-Agent': 'Mozilla/5.0'}
                            resp = requests.get(raw, headers=headers, timeout=15)
                            if resp.status_code == 200:
                                raw = resp.content
                            else:
                                logger.error(f"Failed to download image URL {raw} (Status: {resp.status_code})")
                                continue
                        except Exception as e:
                            logger.error(f"Failed to fetch image URL {raw}: {e}")
                            continue
                    else:
                        try:
                            raw = base64.b64decode(raw)
                        except Exception as e:
                            logger.error(f"Failed to decode base64 for image ID {img_obj.accident_image_id}: {e}")
                            continue

                if isinstance(raw, memoryview):
                    raw = bytes(raw)

                result = self.analyze_accident_image(raw)
                
                img_obj.ai_analyzed_at = timezone.now()
                update_fields = ["ai_analyzed_at"]
                
                if result["success"]:
                    a = result["analysis"]
                    analyses.append(a)

                    # Save AI results back to AccidentImage
                    img_obj.ai_description = a.get("damage_description", "")
                    img_obj.ai_accident_type = self._map_accident_type(a.get("accident_type", "other"))
                    img_obj.ai_analysis_data = a
                    update_fields.extend(["ai_description", "ai_accident_type", "ai_analysis_data"])
                else:
                    img_obj.ai_analysis_data = {"error": result.get("error", "Unknown error")}
                    update_fields.append("ai_analysis_data")
                    
                img_obj.save(update_fields=update_fields)

                # Add a short delay to avoid hitting Groq rate limits
                import time
                time.sleep(1.5)

            aggregate = self._aggregate_image_analyses(analyses)
            return {
                "success": True,
                "images_analyzed": len(analyses),
                "analyses": analyses,
                "aggregate": aggregate
            }

        except Exception as e:
            logger.error(f"analyze_all_accident_images error: {e}")
            return {"success": False, "error": str(e), "images_analyzed": 0,
                    "analyses": [], "aggregate": {}}

    def _map_accident_type(self, label: str) -> str:
        mapping = {
            "أمامي": "front", "خلفي": "rear", "جانبي": "side",
            "انقلاب": "rollover", "خدش": "minor", "كبير": "major"
        }
        for k, v in mapping.items():
            if k in label:
                return v
        return "other"

    def _aggregate_image_analyses(self, analyses: list) -> dict:
        if not analyses:
            return {"max_severity": 0, "total_cost_min": 0,
                    "total_cost_max": 0, "all_damaged_parts": []}

        max_sev = max(a.get("severity_score", 0) for a in analyses)
        total_min = sum(a.get("repair_cost_min", 0) for a in analyses)
        total_max = sum(a.get("repair_cost_max", 0) for a in analyses)
        parts = set()
        for a in analyses:
            parts.update(a.get("damaged_parts", []))
        has_structural = any(a.get("structural_damage", False) for a in analyses)
        non_drivable = any(not a.get("is_drivable", True) for a in analyses)

        return {
            "max_severity": max_sev,
            "total_cost_min": total_min,
            "total_cost_max": total_max,
            "all_damaged_parts": list(parts),
            "has_structural_damage": has_structural,
            "is_drivable": not non_drivable,
            "images_count": len(analyses)
        }


    # ══════════════════════════════════════════════════════════════════
    # 3. COMPREHENSIVE CAR EVALUATION
    # ══════════════════════════════════════════════════════════════════

    def evaluate_car_comprehensive(self, car_vin: str) -> dict:
        """
        Full AI evaluation pipeline:
        1. Load all car data from DB
        2. Analyze all accident images
        3. Search web knowledge for this model's known issues
        4. Generate comprehensive structured report
        5. Save results to Reports table
        """
        try:
            car_data = self._load_car_data(car_vin)
            if not car_data:
                return {"success": False, "error": f"السيارة بـ VIN {car_vin} غير موجودة"}

            # Step 1: Analyze accident images
            image_analysis = self.analyze_all_accident_images(car_vin)

            # Step 2: Build full context for LLM
            context = self._build_full_evaluation_context(car_data, image_analysis)

            # Step 3: Generate comprehensive evaluation via LLM
            evaluation = self._generate_car_evaluation(context, car_data=car_data, image_analysis=image_analysis)

            # Step 4: Save to Reports table
            self._save_to_reports(car_vin, evaluation, image_analysis, car_data)

            return {
                "success": True,
                "vin": car_vin,
                "evaluation": evaluation,
                "image_analysis": image_analysis,
                "generated_at": timezone.now().isoformat()
            }

        except Exception as e:
            logger.error(f"evaluate_car_comprehensive error: {e}")
            return {"success": False, "error": str(e)}

    def _load_car_data(self, vin: str) -> dict | None:
        """Load all related car data from database."""
        try:
            from cars.models import Cars, Evaluation, Repairshops, AccidentImage, ImageCar
            from django.db.models import Avg

            car = Cars.objects.filter(vin__iexact=vin).first()
            if not car:
                return None

            evaluations = Evaluation.objects.filter(car=car)
            repairshops = Repairshops.objects.filter(car=car)
            accident_count = AccidentImage.objects.filter(car=car).count()

            avg_rating = evaluations.aggregate(avg=Avg('rate'))['avg'] or 0

            comments = []
            pros_list = []
            cons_list = []
            for ev in evaluations[:20]:
                if ev.comment:
                    comments.append(ev.comment)
                if ev.pros:
                    pros_list.append(ev.pros)
                if ev.cons:
                    cons_list.append(ev.cons)

            mech_notes = []
            comp_notes = []
            for shop in repairshops:
                if shop.mech_insp_desc:
                    mech_notes.append(shop.mech_insp_desc)
                if shop.comp_scan_desc:
                    comp_notes.append(shop.comp_scan_desc)

            return {
                "vin": car.vin,
                "make": car.make,
                "model": car.model,
                "year": car.year,
                "color": car.color,
                "mileage": car.mileage,
                "fuel_type": car.get_fuel_type_display(),
                "gear_type": car.get_gear_type_display(),
                "engine_capacity": car.engine_capacity,
                "seating_capacity": car.seating_capacity,
                "num_cylinders": car.num_cylinders,
                "avg_user_rating": round(avg_rating, 2),
                "total_evaluations": evaluations.count(),
                "user_comments": comments,
                "user_pros": pros_list,
                "user_cons": cons_list,
                "mech_notes": mech_notes,
                "comp_notes": comp_notes,
                "has_repairshop": repairshops.exists(),
                "accident_images_count": accident_count,
            }
        except Exception as e:
            logger.error(f"_load_car_data error: {e}")
            return None

    def _build_full_evaluation_context(self, car_data: dict, image_analysis: dict) -> str:
        """Build a rich text context for the LLM evaluation prompt."""
        agg = image_analysis.get("aggregate", {})
        
        # 1. Basic Data (Used for age/mileage context)
        lines = [
            f"=== بيانات السيارة الأساسية (استخدمها لحساب عمر السيارة والاستهلاك العام) ===",
            f"الماركة والموديل: {car_data['make']} {car_data['model']} {car_data['year']}",
            f"VIN: {car_data['vin']}",
            f"الممشى: {car_data['mileage']:,} كم",
            f"المحرك: {car_data['engine_capacity']} سم³ - {car_data.get('num_cylinders','')} أسطوانة",
            f"الوقود: {car_data['fuel_type']}",
            f"ناقل الحركة: {car_data['gear_type']}",
            f""
        ]

        # 2. Electronics (Strictly from Computer Scan)
        lines.append(f"=== فحص الكمبيوتر (استخدمه حصراً لتقييم حقل الإلكترونيات electronics_score) ===")
        if car_data.get("comp_notes"):
            lines.extend([f"- {note}" for note in car_data["comp_notes"][:5]])
        else:
            lines.append("لا توجد بيانات لفحص الكمبيوتر (افتراضياً: الأنظمة الإلكترونية سليمة وبحالة المصنع).")
        lines.append("")

        # 3. Engine (Strictly from Mechanical Scan + Mileage)
        lines.append(f"=== الفحص الميكانيكي وسجل الورش (استخدمه مع الممشى لتقييم حقل المحرك engine_score) ===")
        if car_data.get("mech_notes"):
            lines.extend([f"- {note}" for note in car_data["mech_notes"][:5]])
        else:
            lines.append("لا توجد بيانات للفحص الميكانيكي (افتراضياً: المحرك يعمل بكفاءة ممتازة وبدون مشاكل).")
        lines.append("")

        # 4. Safety and Body (Strictly from Accident Images)
        lines.append(f"=== تحليل صور الحوادث (استخدمه لتقييم حقلي الأمان safety_score والهيكل body_score) ===")
        lines.append(f"عدد الصور المحللة: {image_analysis.get('images_analyzed', 0)}")
        lines.append(f"أقصى درجة خطورة للحوادث: {agg.get('max_severity', 0)}/5")
        lines.append(f"أضرار هيكلية أو في الشاسيه: {'نعم' if agg.get('has_structural_damage') else 'لا'}")
        lines.append(f"صالحة للقيادة: {'نعم' if agg.get('is_drivable', True) else 'لا'}")
        lines.append(f"الأجزاء التالفة: {', '.join(agg.get('all_damaged_parts', [])) or 'لا يوجد أي أجزاء تالفة (الهيكل سليم)'}")


        if car_data.get("user_comments"):
            lines += ["", "=== تعليقات المستخدمين ==="]
            lines += [f"- {c}" for c in car_data["user_comments"][:10]]

        if car_data.get("user_pros"):
            lines += ["", "الإيجابيات من المستخدمين:"]
            lines += [f"+ {p}" for p in car_data["user_pros"][:5]]

        if car_data.get("user_cons"):
            lines += ["", "السلبيات من المستخدمين:"]
            lines += [f"- {c}" for c in car_data["user_cons"][:5]]

        lines += [
            "",
            f"=== إحصائيات التقييم ===",
            f"متوسط تقييم المستخدمين: {car_data['avg_user_rating']}/5 ({car_data['total_evaluations']} تقييم)",
        ]

        return "\n".join(lines)


    def _generate_car_evaluation(self, context: str, car_data: dict = None, image_analysis: dict = None) -> dict:
        """Call LLM to generate the full structured evaluation."""
        prompt = f"""أنت خبير تقييم سيارات دولي معتمد. بناءً على البيانات التالية، قدم تقييماً شاملاً ودقيقاً.

{context}

استخدم أيضاً معرفتك العامة بهذا الموديل (الأعطال الشائعة، آراء المستخدمين حول العالم، نقاط القوة والضعف المعروفة).

أعطني JSON فقط بالشكل التالي:
{{
  "overall_score": 0,
  "condition_label": "ممتازة|جيدة جداً|جيدة|متوسطة|تحتاج إصلاحات",
  "engine_score": 0,
  "body_score": 0,
  "electronics_score": 0,
  "safety_score": 0,
  "value_score": 0,
  "accident_severity_score": 0,
  "accident_description": "وصف احترافي للحوادث",
  "known_issues": ["الأعطال الشائعة لهذا الموديل"],
  "strengths": ["نقاط القوة"],
  "weaknesses": ["نقاط الضعف"],
  "user_sentiment": "تحليل آراء المستخدمين",
  "purchase_recommendation": "ننصح|متردد|لا ننصح",
  "recommendation_reason": "سبب التوصية",
  "estimated_remaining_life_km": 0,
  "confidence": 0.0
}}
جميع الأرقام من 0 إلى 100 ما عدا accident_severity_score (0-5) وconfidence (0-1)."""

        try:
            system_prompt = """أنت خبير تقييم سيارات صارم ومحترف. يجب عليك إرجاع JSON صالح فقط (Valid JSON).

قواعد التقييم الإلزامية (يجب الالتزام بها حرفياً لبناء تقييم مرآة للبيانات):

1. قاعدة العزل التام (Total Isolation Rule) - هام جداً:
   - يمنع منعاً باتاً أن تتأثر درجة (الهيكل) أو (الأمان) بأي نصوص واردة في "سجل الصيانة" أو "الفحص الميكانيكي".
   - يمنع منعاً باتاً أن تتأثر درجة (المحرك) بوجود حوادث أو صدمات في الهيكل.
   - كل حقل يجب أن يعبر عن حالته التقنية بناءً على مصدره المحدد فقط.

2. حقل الهيكل (body_score):
   - المصدر الحصري والوحيد: تحليل صور الحوادث ووصف الأضرار الناتجة عن الحوادث.
   - القاعدة: إذا كانت السيارة بها صيانة ميكانيكية سيئة جداً ولكن سجل الحوادث نظيف، يجب أن يظل تقييم الهيكل 90% فأعلى. الهيكل لا يتأثر بالمحرك أو الزيوت أو التهريبات.

3. حقل الأمان (safety_score):
   - المصدر الحصري والوحيد: (قوة الحوادث المسجلة) و (عمر السيارة/الموديل).
   - القاعدة: الأمان يعتمد على سلامة الشاسيه وقوة الصدمات السابقة فقط. حالة المحرك أو الأعطال الميكانيكية لا تنقص من درجة الأمان نهائياً في هذا النظام.

4. حقل المحرك (engine_score):
   - المصدر الحصري: (سجل الورش/الفحص الميكانيكي) بالإضافة لـ (الممشى).
   - القاعدة: هو الحقل الوحيد الذي يتأثر بنصوص مثل "تهريب زيت، يحتاج توضيب، حرارة، صوت في الماكينة".

5. حقل الإلكترونيات (electronics_score):
   - المصدر الحصري: نتائج (فحص الكمبيوتر) فقط.

6. القاعدة الذهبية للتحليل:
   التقييم يجب أن يكون "ديناميكي" بشكل صارم ويعكس البيانات تماماً.
   - ممنوع منعاً باتاً إعطاء تقييم افتراضي 50% لمجرد غياب معلومة!
   - إذا لم تتوفر بيانات سلبية في قسم معين، افترض أن حالة هذا القسم جيدة جداً (85% فأعلى).
   - إذا توفرت بيانات سلبية في مصدر الحقل، يجب أن ينعكس ذلك فوراً بانهيار التقييم (تحت 45%)."""

            resp = self.client.chat.completions.create(
                model=self.CHAT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            result = _extract_json(resp.choices[0].message.content)
            if not result:
                result = self._default_evaluation()
            # Post-process: enforce 30% floor + mileage/age/accident adjustments + compute overall
            result = self._post_process_evaluation(result, car_data=car_data, image_analysis=image_analysis)
            return result
        except Exception as e:
            logger.error(f"_generate_car_evaluation error: {e}")
            return self._post_process_evaluation(self._default_evaluation(), car_data=car_data, image_analysis=image_analysis)

    # ──────────────────────────────────────────────────────────
    # Post-processing: Floor Limit 30% + Computed Overall Score
    # ──────────────────────────────────────────────────────────

    FLOOR_LIMIT = 30  # Minimum allowed score for any field
    SUB_SCORE_KEYS = ["engine_score", "body_score", "electronics_score", "safety_score", "value_score"]

    def _enforce_floor(self, value: int | float) -> int:
        """Clamp a score to [FLOOR_LIMIT, 100]."""
        return max(self.FLOOR_LIMIT, min(100, int(value)))

    def _post_process_evaluation(self, evaluation: dict, car_data: dict = None, image_analysis: dict = None) -> dict:
        """
        Apply business rules after LLM evaluation:
        1. Enforce 30% floor on every sub-score
        2. Apply programmatic mileage penalty on engine_score
        3. Apply programmatic age penalty on value_score and safety_score
        4. Apply programmatic accident severity caps on safety_score and body_score
        5. Re-enforce floor after adjustments
        6. Compute overall_score as average of sub-scores
        7. Determine condition_label from overall_score
        """
        # 1. Enforce floor on each sub-score (existing logic preserved)
        for key in self.SUB_SCORE_KEYS:
            if key in evaluation:
                evaluation[key] = self._enforce_floor(evaluation[key])

        # ── NEW: Programmatic adjustments for missing data & penalties ──
        has_accidents = False
        if image_analysis:
            agg = image_analysis.get("aggregate", {})
            has_accidents = agg.get("images_count", 0) > 0

        if car_data:
            has_comp_notes = len(car_data.get("comp_notes", [])) > 0
            has_mech_notes = len(car_data.get("mech_notes", [])) > 0
            mileage = car_data.get("mileage", 0) or 0
            car_year = car_data.get("year", 2024) or 2024
            current_year = timezone.now().year
            car_age = max(0, current_year - car_year)

            # 1. Electronics: إذا لم يوجد نص، اجعل الحقل الرمادي (None)
            if not has_comp_notes:
                evaluation["electronics_score"] = None

            # 2. Engine: إذا لم تتوفر بيانات صيانة، التقييم بناءً على الممشى فقط (Start at 100)
            if not has_mech_notes:
                evaluation["engine_score"] = 100

            # 3. Body: في حال انعدام بيانات الحوادث: None
            if not has_accidents:
                evaluation["body_score"] = None

            # 4. Safety: إذا لم توجد بيانات الحوادث، التقييم بناءً على عمر السيارة فقط (Start at 100)
            if not has_accidents:
                evaluation["safety_score"] = 100

            # ── Penalties (Apply only if not None) ──

            # Mileage penalty on engine_score
            if evaluation.get("engine_score") is not None:
                if mileage > 700000:
                    evaluation["engine_score"] -= 45
                elif mileage > 500000:
                    evaluation["engine_score"] -= 30
                elif mileage > 300000:
                    evaluation["engine_score"] -= 20
                elif mileage > 200000:
                    evaluation["engine_score"] -= 12
                elif mileage > 150000:
                    evaluation["engine_score"] -= 7
                elif mileage > 100000:
                    evaluation["engine_score"] -= 3

            # Age penalty on value_score
            if evaluation.get("value_score") is not None:
                if car_age > 20:
                    evaluation["value_score"] -= 20
                elif car_age > 15:
                    evaluation["value_score"] -= 15
                elif car_age > 10:
                    evaluation["value_score"] -= 10
                elif car_age > 7:
                    evaluation["value_score"] -= 5

            # Mileage penalty on value_score
            if evaluation.get("value_score") is not None:
                if mileage > 300000:
                    evaluation["value_score"] -= 18
                elif mileage > 200000:
                    evaluation["value_score"] -= 12
                elif mileage > 150000:
                    evaluation["value_score"] -= 7
                elif mileage > 100000:
                    evaluation["value_score"] -= 3

            # Age penalty on safety if NO accidents (rule 4)
            if not has_accidents and evaluation.get("safety_score") is not None:
                if car_age > 30:
                    evaluation["safety_score"] -= 40
                elif car_age > 25:
                    evaluation["safety_score"] -= 30
                elif car_age > 20:
                    evaluation["safety_score"] -= 20
                elif car_age > 15:
                    evaluation["safety_score"] -= 12
                elif car_age > 10:
                    evaluation["safety_score"] -= 7
                elif car_age > 7:
                    evaluation["safety_score"] -= 3

        # 4. Accident severity impact on safety_score and body_score
        if has_accidents and image_analysis:
            agg = image_analysis.get("aggregate", {})
            max_severity = agg.get("max_severity", 0) or 0
            has_structural = agg.get("has_structural_damage", False)
            num_images = agg.get("images_count", 0) or 0

            # ── Isolation Guard: Reset Body/Safety to clear LLM bleeding from maintenance notes ──
            if evaluation.get("safety_score") is not None:
                evaluation["safety_score"] = 100
            if evaluation.get("body_score") is not None:
                evaluation["body_score"] = 100

            # Apply severity impacts
            if evaluation.get("safety_score") is not None:
                if max_severity >= 4 or has_structural:
                    evaluation["safety_score"] = 35
                elif max_severity >= 3:
                    evaluation["safety_score"] = 55
                elif max_severity >= 1:
                    evaluation["safety_score"] = 80

            if evaluation.get("body_score") is not None:
                if max_severity >= 4 or has_structural:
                    evaluation["body_score"] = 35
                elif max_severity >= 3:
                    evaluation["body_score"] = 70
                elif max_severity >= 1:
                    evaluation["body_score"] = 90

            # Age amplifier: old cars with accidents get extra safety penalty
            if car_data and max_severity > 0 and evaluation.get("safety_score") is not None:
                car_year = car_data.get("year", 2024) or 2024
                car_age = max(0, timezone.now().year - car_year)
                if car_age > 30:
                    evaluation["safety_score"] -= 35
                elif car_age > 25:
                    evaluation["safety_score"] -= 25
                elif car_age > 20:
                    evaluation["safety_score"] -= 18
                elif car_age > 15:
                    evaluation["safety_score"] -= 12
                elif car_age > 10:
                    evaluation["safety_score"] -= 7
                elif car_age > 7:
                    evaluation["safety_score"] -= 3

            # Multiple accidents compound: extra body penalty per additional image
            if num_images > 1 and evaluation.get("body_score") is not None:
                extra_penalty = min(15, (num_images - 1) * 5)
                evaluation["body_score"] -= extra_penalty

        # ── END new adjustments ──

        # 5. Re-enforce floor after all adjustments (safety net)
        for key in self.SUB_SCORE_KEYS:
            if key in evaluation and evaluation[key] is not None:
                evaluation[key] = self._enforce_floor(evaluation[key])

        # 6. Compute overall_score as average of the valid non-None sub-scores
        valid_scores = [evaluation[k] for k in self.SUB_SCORE_KEYS if evaluation.get(k) is not None]
        if valid_scores:
            evaluation["overall_score"] = self._enforce_floor(round(sum(valid_scores) / len(valid_scores)))
        else:
            evaluation["overall_score"] = self.FLOOR_LIMIT

        # 7. Determine condition label from overall
        overall = evaluation["overall_score"]
        if overall >= 85:
            evaluation["condition_label"] = "ممتازة"
        elif overall >= 70:
            evaluation["condition_label"] = "جيدة جداً"
        elif overall >= 55:
            evaluation["condition_label"] = "جيدة"
        elif overall >= 40:
            evaluation["condition_label"] = "متوسطة"
        else:
            evaluation["condition_label"] = "تحتاج إصلاحات"

        return evaluation

    def _default_evaluation(self) -> dict:
        return {
            "overall_score": 85, "condition_label": "جيدة جداً",
            "engine_score": 85, "body_score": 85, "electronics_score": 85,
            "safety_score": 85, "value_score": 85, "accident_severity_score": 0,
            "accident_description": "لا توجد بيانات كافية",
            "detailed_report": "", "known_issues": [], "strengths": [],
            "weaknesses": [], "user_sentiment": "", "purchase_recommendation": "متردد",
            "recommendation_reason": "",
            "estimated_remaining_life_km": 0, "confidence": 0.3
        }

    def _save_to_reports(self, vin: str, evaluation: dict,
                         image_analysis: dict, car_data: dict):
        """Save AI evaluation results to the Reports table."""
        try:
            from cars.models import Cars, Reports
            from django.db.models import Avg

            car = Cars.objects.filter(vin__iexact=vin).first()
            if not car:
                return

            report, _ = Reports.objects.get_or_create(car=car)
            agg = image_analysis.get("aggregate", {})

            # Map 0-100 score to 0-10
            raw_score = evaluation.get("overall_score", 50)
            report.overall_ai_score = round(raw_score / 10, 1)
            report.accident_severity_score = min(5, evaluation.get("accident_severity_score", 0))
            
            # Re-enable detailed_report to show the comprehensive AI evaluation
            detailed_text = f"{evaluation.get('accident_description', '')}\n\n{evaluation.get('recommendation_reason', '')}"
            report.detailed_report = detailed_text.strip()

            # Avg user rating
            from cars.models import Evaluation as EvalModel
            evals = EvalModel.objects.filter(car=car)
            if evals.exists():
                report.avg_user_rating = evals.aggregate(Avg('rate'))['rate__avg']

            # Car snapshot
            report.car_snapshot = {
                "vin": car.vin, "make": car.make, "model": car.model,
                "year": car.year, "mileage": car.mileage,
                "fuel": car.get_fuel_type_display()
            }

            # Radar chart data: Use evaluation values directly (might be None)
            # Frontend handles None by showing N/A
            report.risk_assessment_data = {
                "radar_chart": [
                    {"subject": "المحرك", "value": evaluation.get("engine_score"), "fullMark": 100},
                    {"subject": "الهيكل", "value": evaluation.get("body_score"), "fullMark": 100},
                    {"subject": "الأمان", "value": evaluation.get("safety_score"), "fullMark": 100},
                    {"subject": "الإلكترونيات", "value": evaluation.get("electronics_score"), "fullMark": 100},
                    {"subject": "القيمة", "value": evaluation.get("value_score"), "fullMark": 100},
                ],
                "severity_info": {
                    "level": report.accident_severity_score,
                    "text": report.get_severity_display(),
                    "color": report.get_risk_color()
                },
                "purchase_recommendation": evaluation.get("purchase_recommendation", "متردد"),
                "known_issues": evaluation.get("known_issues", []),
                "strengths": evaluation.get("strengths", []),
                "weaknesses": evaluation.get("weaknesses", []),
                "repair_cost_range": {
                    "min": agg.get("total_cost_min", 0),
                    "max": agg.get("total_cost_max", 0)
                }
            }

            report.save()
            logger.info(f"Report saved for VIN {vin}")

        except Exception as e:
            logger.error(f"_save_to_reports error: {e}")

    # ══════════════════════════════════════════════════════════════════
    # 4. ERROR HANDLING
    # ══════════════════════════════════════════════════════════════════

    def _handle_error(self, e: Exception) -> dict:
        msg = str(e)
        if "403" in msg or "Access denied" in msg:
            return {"error": "AI service access denied. Check API key."}
        if "429" in msg or "rate limit" in msg.lower():
            return {"error": "Rate limit exceeded. Please try again later."}
        return {"error": f"AI service error: {msg}"}
