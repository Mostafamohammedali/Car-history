from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatMessage(models.Model):
    MESSAGE_TYPES = [
        ('user', 'User Message'),
        ('ai', 'AI Response'),
    ]
    
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    session_id = models.CharField(max_length=100, default='default', verbose_name='معرف الجلسة')
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, verbose_name='نوع الرسالة')
    content = models.TextField(verbose_name='محتوى الرسالة')
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='الوقت')
    
    class Meta:
        ordering = ['timestamp']
        verbose_name = 'رسالة دردشة'
        verbose_name_plural = 'رسائل الدردشة'

    def __str__(self):
        return f"{self.message_type}: {self.content[:50]}..."
