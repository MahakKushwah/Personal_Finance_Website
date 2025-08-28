from django.contrib import admin

# Register your models here.
from .models import BankDetails, FileDetails

# FileDetails/admin.py
admin.site.register(BankDetails)
admin.site.register(FileDetails)

