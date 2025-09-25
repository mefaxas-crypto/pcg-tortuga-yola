from django.urls import path
from .views import PantryItemListCreate, PantryItemRetrieveUpdateDestroy

urlpatterns = [
    path('pantry-items/', PantryItemListCreate.as_view(), name='pantry-item-list-create'),
    path('pantry-items/<int:pk>/', PantryItemRetrieveUpdateDestroy.as_view(), name='pantry-item-retrieve-update-destroy'),
]
