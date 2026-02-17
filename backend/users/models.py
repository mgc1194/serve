"""
users/models.py — Household and CustomUser models.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class Household(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'households'


class CustomUser(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    Adds a ManyToMany relationship to Household so a user
    can belong to multiple households (e.g. managing parents' finances).
    """
    households = models.ManyToManyField(
        Household,
        related_name='users',
        blank=True,
    )
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_users',
        blank=True,
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_users',
        blank=True,
    )

    def __str__(self):
        if self.email:
            return f'{self.username} ({self.email})'
        return self.username

    class Meta:
        db_table = 'users'
