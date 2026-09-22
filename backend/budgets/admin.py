from django.contrib import admin

from .models import Budget, BudgetLine, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'household', 'is_active', 'created_at')
    list_filter = ('type', 'is_active', 'household')
    search_fields = ('name',)
    raw_id_fields = ('household',)


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'household', 'period_start', 'period_end', 'is_active')
    list_filter = ('type', 'is_active', 'household')
    search_fields = ('name',)
    raw_id_fields = ('household',)


@admin.register(BudgetLine)
class BudgetLineAdmin(admin.ModelAdmin):
    list_display = ('budget', 'category', 'planned_amount')
    list_filter = ('budget__household',)
    raw_id_fields = ('budget', 'category')
