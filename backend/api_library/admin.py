from django.contrib import admin

# Register your models here.
from .models import Author, Book, Category, Loan, QrAccess

admin.site.register(Author)
admin.site.register(Book)
admin.site.register(Category)
admin.site.register(Loan)
admin.site.register(QrAccess)
