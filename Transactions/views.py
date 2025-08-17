from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import Transaction
import json
from decimal import Decimal
import re
from datetime import datetime

# Clean currency values like "₹ 1,234.56"
def clean_amount(value):
    if value is None:
        return Decimal('0.00')

    # Convert any int/float to string
    value_str = str(value).strip()

    # Remove anything that is not a digit or decimal point
    cleaned = re.sub(r'[^\d.]', '', value_str)

    return Decimal(cleaned or '0.00')

# # Convert string date to YYYY-MM-DD
# def parse_date(date_string):
#     try:
#         return datetime.strptime(date_string, '%d-%m-%Y').date()
#     except Exception as e:
#         print(f"Date parse error: {e} for input {date_string}")
#         return None

# Upload Transactions File 
@csrf_exempt
def upload_transactions(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)

    try:
        data = json.loads(request.body)
        transactions = data.get('transactions', [])

        # Debugging logs
        print("Request method:", request.method)
        print("Received transactions:", transactions[:5])  #Show first 5 rows

        if not isinstance(transactions, list):
            return JsonResponse({'error': 'Transactions should be a list'}, status=400)

        saved_count = 0
        for i, t in enumerate(transactions):
            try:
                if not isinstance(t, dict):
                    print(f"Skipping row {i+1}: not a dict -> {t}")
                    continue

                # --- DATE HANDLING ---
                date_str = (
                    t.get('Date') or
                    t.get('Txn Date') or
                    t.get('date') or
                    ""
                ).strip()

                parsed_date = None
                for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d'):
                    try:
                        parsed_date = datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        continue
                if not parsed_date:
                    print(f"Skipping row {i+1}: invalid date -> {date_str}")
                    continue

                category = t.get("category");
                description = t.get("description", '');
                credit_val = clean_amount(t.get("deposit",0))
                debit_val = clean_amount(t.get("withdrawal",0))
                balance_val = clean_amount(t.get("balance",0))
                description = t.get("remarks", '')

                if credit_val > 0:
                    credit = credit_val
                else : 
                    credit = 0 
                    
                if debit_val > 0:
                    debit = debit_val
                else:
                    debit = 0

                # --- SAVE TO DB ---
                Transaction.objects.create(
                    date=parsed_date,
                    category=t.get('category', category),
                    description=description,
                    amount=balance_val,
                    credit = credit,
                    debit = debit
                )
                saved_count += 1
                print("Saved Count : "+ saved_count)
            except Exception as e:
                print(f"Error in row {i+1}: {e}")
                continue

        return JsonResponse({
            'message': f'Uploaded successfully: {saved_count} transactions saved'
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

# Filter the data based on date range
def transaction_list(request):
    print("Transaction list request : "+ request)
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    if start_date and end_date:
        transactions = Transaction.objects.filter(date__range=[start_date, end_date]).order_by('date')
    else:
        transactions = Transaction.objects.all().order_by('date')

    # Get latest (last) amount by category
    latest_by_category = {}
    for txn in transactions:
        latest_by_category[txn.category] = float(txn.amount)

    return render(request, 'auth/dashboard.html', {
        'start_date': start_date,
        'end_date': end_date,
        'category_data': json.dumps(latest_by_category),
        'transactions': transactions
    })
