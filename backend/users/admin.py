from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Household, CustomUser


@admin.register(Household)
class HouseholdAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name',)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    filter_horizontal = ('households', 'groups', 'user_permissions')

    fieldsets = UserAdmin.fieldsets + (
        ('Households', {'fields': ('households',)}),
    )

