from rest_framework import serializers
from .models import ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages"""
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'user', 'session_id', 'message_type', 'content', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new chat messages"""
    
    class Meta:
        model = ChatMessage
        fields = ['user', 'session_id', 'message_type', 'content']


class ChatHistorySerializer(serializers.ModelSerializer):
    """Serializer for chat history"""
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'user', 'session_id', 'message_type', 'content', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']
