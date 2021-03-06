# Generated by Django 3.1.7 on 2021-03-14 16:09

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api_library', '0004_image_book'),
    ]

    operations = [
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('dt_created', models.DateTimeField(auto_now_add=True)),
                ('dt_updated', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(db_index=True, max_length=100)),
                ('enabled', models.BooleanField(default=True, help_text='Catégorie activée ?')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='book',
            name='category',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='books', to='api_library.category'),
        ),
    ]
