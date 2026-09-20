from django.contrib import admin

from .models import Label, Transaction


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'color', 'household')
    list_filter = ('category', 'household')
    search_fields = ('name',)
    list_select_related = ('category', 'household')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'date', 'concept', 'amount', 'account', 'category', 'label')
    list_filter = ('date', 'category', 'label', 'account__household')
    search_fields = ('concept', 'id')
    raw_id_fields = ('account',)
    readonly_fields = ('id', 'imported_at')
    date_hierarchy = 'date'
