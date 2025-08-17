from django.db import models

# Create your models here.

class Transaction(models.Model):
    date = models.DateField()
    category = models.CharField(max_length=100)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    credit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    debit = models.DecimalField(max_digits=10, decimal_places=2, default=0)