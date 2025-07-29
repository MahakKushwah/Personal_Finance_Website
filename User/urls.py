from django.urls import path
from . import views 

urlpatterns = [
    path('',views.Login_View,name='login'),
    path('register/',views.Register_View,name='register'),   
    path('logout/',views.Logout_View,name='logout'),
    path('dashboard/',views.Dashboard_View,name='dashboard'),

]