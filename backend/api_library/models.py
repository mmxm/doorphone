from django.contrib.auth.models import AbstractUser, User
from django.db import models

class TimeStampedModel(models.Model):
    """
    Classe utilitaire, champs dt_created / dt_updated
    """
    dt_created = models.DateTimeField(auto_now_add=True)
    dt_updated = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Author(TimeStampedModel):
    first_name = models.CharField(max_length=50, null=False, blank=False)
    last_name = models.CharField(max_length=50, null=False, blank=False)

    def __str__(self):
        return '{} {}'.format(self.first_name, self.last_name)

class Category(TimeStampedModel):
    name = models.CharField(max_length=100, null=False, blank=False, db_index=True)
    enabled = models.BooleanField(default=True, help_text='Catégorie activée ?')

    class Meta:
        verbose_name_plural = "catégories"

    def __str__(self):
        return '{} : {}'.format(self.name, self.enabled)

class Book(TimeStampedModel):
    name = models.CharField(max_length=100, null=False, blank=False, db_index=True)
    summary = models.TextField(null=True, blank=True)
    nb_pages = models.IntegerField()

    author = models.ForeignKey(Author,
                               related_name='books',
                               null=True,
                               on_delete=models.SET_NULL)

    enabled = models.BooleanField(default=True, help_text='disponible ou non')

    borrowers = models.ManyToManyField(User,
                                   through='Loan',
                                   through_fields=('book', 'user'),
                                   related_name='users_loans',
                                   help_text='les emprunts du livre')

    picture = models.ImageField(upload_to='books/', max_length=250, null=True, blank=True)

    category = models.ForeignKey(Category, related_name='books', null=True, on_delete=models.SET_NULL)

    def __str__(self):
        return '{} : {}'.format(self.name, self.author)

class Loan(TimeStampedModel):
    """
    Les emprunts
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    in_progress = models.BooleanField(default=True)
    date_loan = models.DateTimeField(auto_now_add=True)
    date_return = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return '{} {}'.format(self.user, self.book)

class QrAccess(TimeStampedModel):
    """
    QR code for temporary access
    """
    qr_code = models.CharField(max_length=100, null=False, blank=False, db_index=True)
    validity_date_start = models.DateTimeField(auto_now_add=True)
    validity_date_end = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return '{} {}'.format(self.qr_code, self.validity_date_start, self.validity_date_end)
