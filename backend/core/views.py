from rest_framework import generics
from .models import PantryItem
from .serializers import PantryItemSerializer

class PantryItemListCreate(generics.ListCreateAPIView):
    queryset = PantryItem.objects.all()
    serializer_class = PantryItemSerializer

class PantryItemRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = PantryItem.objects.all()
    serializer_class = PantryItemSerializer
