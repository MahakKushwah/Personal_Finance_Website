from django.shortcuts import render

# Create your views here.
from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout
from .forms import CustomUserCreationForm
from django.contrib import messages
from django.http import HttpResponse

# Create your views here.
# Registeration Method - If user donot have the account
def Register_View(request) :
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        # form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request,user)
            return redirect('dashboard')
    else :
        # By default Django provides the None in the textbox if no value provided 
        # To hide the None in the text box 
        initial_data = {'username':'', 'email':'', 'first_name':'', 'last_name':'', 'password1':'', 'password2':""}
        form = CustomUserCreationForm(initial=initial_data)
        # form = UserCreationForm(initial=initial_data)
    return render(request,'auth/register.html',{'form' : form})
    # return HttpResponse("You are at Register page")

# Login Method
def Login_View(request) :
    if request.method == 'POST':
        form = AuthenticationForm(request,data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request,user)
            return redirect('dashboard')
        else:
            messages.error(request, "Login Failed - You entered wrong username or password !")
    else :
        # By default Django provides the None in the textbox if no value provided 
        # To hide the None in the text box 
        initial_data = {'username':'', 'password':''}
        form = AuthenticationForm(initial=initial_data)
    return render(request,'auth/login.html',{'form' : form})

# Logout Method
def Logout_View(request) :
    logout(request)
    return redirect('login')
    
# Dashboard Method
def Dashboard_View(request) :
    return HttpResponse("You are at Dashboard Page")