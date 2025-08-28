from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import Transaction
from FileDetails.models import FileDetails, BankDetails
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

BANK_CODE_MAP = {
    "HDFC": "HDFC Bank",
    "SBIN": "State Bank of India",
    "ICIC": "ICICI Bank",
    "PNBN": "Punjab National Bank",
    "AXIS": "Axis Bank",
    "KARB": "Karnataka Bank",
    "YESB": "Yes Bank",
    "IDFB": "IDFC First Bank",
    "UBIN": "Union Bank of India",
    "BARB": "Bank of Baroda",
}

# Upload Transactions File 
@csrf_exempt
def upload_transactions(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)

    try:
        user_id = request.session.get("user_id")

        # Fallback if session key missing but user still logged in
        if not user_id and request.user.is_authenticated:
            user_id = request.user.id

        # If still no user, force re-login
        if not user_id:
            return JsonResponse({"error": "User not logged in or session expired"}, status=401)

        data = json.loads(request.body)
        fd_data = data.get("file_details", {}).get("details", {})  # file and bank-related info
        bank_data = data.get("file_details", {}).get("bankDetails", {})
        transactions = data.get('transactions', [])
        print("Statement Date : " , fd_data.get("statementDate"))
        print("Data : ", data)
        print("fd_data : ",fd_data);
        print("Details:", data.get("file_details", {}).get("details", {}))
        print("Bank data:", data.get("file_details", {}).get("bankDetails", {}))
        print("Type of fd_data : ", type(fd_data))
        print("transactions : ",transactions)
        print("Type of transactions : ", type(transactions))

        # Debugging logs
        if not isinstance(transactions, list):
            return JsonResponse({'error': 'Transactions should be a list'}, status=400)

        # Detect bank from IFSC prefix
        ifsc = bank_data.get('ifsc_code')
        bank_name = bank_data.get("bankName")
        if(ifsc):
            bank_code = ifsc[:4].upper()
            bank_name = BANK_CODE_MAP.get(bank_code, "Unknown Bank")      
        
        # Bank Details Saving in Database
        bank_obj, __ = BankDetails.objects.update_or_create(
            bank_account_num=bank_data.get("accountNumber"),
            cif_number = bank_data.get("cif_number"),
            defaults={
                "bank_name": bank_name,
                "bank_branch": bank_data.get("branch"),
                "ifsc_code": ifsc,
            }
        )

        # --- DATE HANDLING ---        
        if(fd_data.get("statementDate") ) != None : 
            parsed_statement_date = ( fd_data.get("statementDate")).strip()
        else:
            parsed_statement_date = ( fd_data.get("transactionDateTo")).strip()

        for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d'):
            try:
                statementDate = datetime.strptime(parsed_statement_date, fmt).date()
                break
            except ValueError:
                print(f"Invalid statement date format -> {parsed_statement_date} with fmt {fmt}")
                continue
        
        saved_count = 0
        # File Deatils Saving in Database 
        # 2. Create FileDetails and link with Bank
        file_obj = FileDetails.objects.create(
            user_id=user_id,    # logged-in or newly created user
            file_name=fd_data.get("fileName"),
            statement_type=fd_data.get("statementType"),
            bank =bank_obj,
            bank_id = bank_obj.id,
            account_name=fd_data.get("accountName"),
            statement_date=statementDate,   
            upload_date = fd_data.get("uploadDate"),        
            address=fd_data.get("address")            
        )

        #Transactions  Saving in Database
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
                        print(f"Skipping row {i+1}: invalid date -> {date_str}")
                        continue

                category = t.get("category");
                description = t.get("description", '');
                credit_val = clean_amount(t.get("deposit",0))
                debit_val = clean_amount(t.get("withdrawal",0))
                balance_val = clean_amount(t.get("balance",0))

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
                    file_details=file_obj,
                    date=parsed_date,
                    category=t.get('category', category),
                    description=description,
                    amount=balance_val,
                    credit = credit,
                    debit = debit,
                    filename = file_obj.file_name,
                    file_details_id = file_obj.id,
                    bank_name = bank_name
                )
                saved_count += 1
                print("Saved Count : ", saved_count)
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

def delete_all_transactions(request):
    if request.method == "POST":
        Transaction.objects.all().delete()
        return JsonResponse({"message": "All transactions deleted successfully"})
    return JsonResponse({"error": "Invalid request"}, status=400)
