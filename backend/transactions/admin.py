from django.contrib import admin
from .models import Account, AccountType, Bank, Transaction


@admin.register(Bank)
class BankAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name',)


@admin.register(AccountType)
class AccountTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'bank', 'handler_key', 'created_at')
    list_filter = ('bank',)
    search_fields = ('name',)
    raw_id_fields = ('bank',)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'account_type', 'household', 'created_at')
    list_filter = ('account_type__bank', 'household')
    search_fields = ('name',)
    raw_id_fields = ('account_type', 'household')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'date', 'concept', 'amount', 'account', 'category', 'label')
    list_filter = ('date', 'category', 'label', 'account__household')
    search_fields = ('concept', 'id')
    raw_id_fields = ('account',)
    readonly_fields = ('id', 'imported_at')
    date_hierarchy = 'date'
