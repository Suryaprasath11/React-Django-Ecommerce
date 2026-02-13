from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Carousel, Cart, CartItem, CustomUser, Order, OrderItem, ProductImage, ProductRating , Product , Category, Review, WishList
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email","first_name","last_name")

admin.site.register(CustomUser , CustomUserAdmin)

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    max_num = 12


class ProductAdmin(admin.ModelAdmin):
    list_display = ("name","price","featured")
    inlines = [ProductImageInline]

admin.site.register(Product , ProductAdmin)


class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name","slug")

admin.site.register(Category , CategoryAdmin)

admin.site.register([Cart , CartItem , Review , ProductRating , WishList , Order , OrderItem , Carousel])
