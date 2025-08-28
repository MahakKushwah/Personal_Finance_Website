from django.db import models

# Create your models here.

class Transaction(models.Model):
    file_details = models.ForeignKey(
        "FileDetails.FileDetails",
        on_delete=models.CASCADE,
        related_name="transactions",
        null=True, blank=True
    )
    date = models.DateField()
    category = models.CharField(max_length=100)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    credit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    debit = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # New fields
    filename = models.CharField(max_length=255, null=True, blank=True) 
    bank_name = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "transactions"

    def __str__(self):
        return f"Txn {self.id} | {self.date} | {self.category} | {self.amount} | File: {self.filename or 'N/A'}"