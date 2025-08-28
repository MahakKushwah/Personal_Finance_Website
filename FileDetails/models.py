from django.db import models
from django.contrib.auth.models import User   # import the built-in User model

# Create your models here.

# Bank Details Models
class BankDetails(models.Model):     
    bank_name = models.CharField(max_length=255,null=True,blank=True)
    bank_account_num = models.CharField(max_length=50,null=True,blank=True) 
    bank_branch = models.CharField(max_length=255, null=True, blank=True)
    cif_number = models.CharField(max_length=50, null=True, blank=True)
    ifsc_code = models.CharField(max_length=20,null=True,blank=True)

    class Meta:
        db_table = "bank_details"

    def __str__(self):
        return f"{self.bank_name} - {self.bank_account_num}"
    
# FileTypes
FILE_TYPES = [
    ("BANK", "Bank Statement"),                # Savings/Current Accounts
    ("MUTUAL", "Mutual Fund Statement"),       # Mutual funds
    ("CREDIT", "Credit Card Statement"),       # Credit card bills
    ("LOAN", "Loan Statement"),                # Home / Car / Personal loan
    ("FD", "Fixed Deposit Statement"),         # Term deposits
    ("INSURANCE", "Insurance Statement"),      # Life/Health insurance premium receipts
    ("PF", "Provident Fund Statement"),        # EPF/PPF accounts
    ("STOCK", "Stock/Demat Statement"),        # Shareholding reports
    ("BROKER", "Brokerage Statement"),         # Zerodha / Upstox / etc.
    ("WALLET", "Wallet/UPI Statement"),        # Paytm / PhonePe / GPay
    ("OTHER", "Other"),                        # Fallback for unknown types
]    
# File Details Models
class FileDetails(models.Model):
    user = models.ForeignKey(        
        User,
        on_delete=models.CASCADE,
        related_name="file_details",
        null=True, blank=True
    )
    bank = models.ForeignKey(
        BankDetails,
        on_delete=models.CASCADE,
        related_name="accounts",
        null=True, blank=True
    )
    file_name = models.CharField(max_length=255)
    statement_type = models.CharField(max_length=50,choices=FILE_TYPES,default="OTHER")
    account_name = models.CharField(max_length=255)
    upload_date = models.DateField(null=True, blank=True)
    statement_date = models.DateField(null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = "file_details"

    def __str__(self):
        return f"{self.file_name} ({self.account_name})"
    
