from django.urls import path
from .views import upload_transactions
from . import views

urlpatterns = [
    path('api/upload-transactions/', upload_transactions, name='upload-transactions'),
    path('transactions/', views.transaction_list, name='transaction_list'),
]