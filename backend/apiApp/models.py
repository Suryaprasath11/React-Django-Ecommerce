from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.text import slugify
from MadstoreApi import settings
import uuid
from django.core.exceptions import ValidationError

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    profile_picture_url = models.URLField(blank=True ,null=True)

    def __str__(self):
        return self.email
    
class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True,blank=True)
    image = models.ImageField(upload_to='Product_imges', blank=True , null=True)

    def __str__(self):
        return self.name
    
    def save(self , *args, **kwargs):

        if not self.slug:
            self.slug = slugify(self.name)
            unique_slug = self.slug
            counter = 1
            if Product.objects.filter(slug=unique_slug).exists():
                unique_slug = f"{self.slug}-{counter}"
                counter += 1
            self.slug = unique_slug
        super().save(*args, **kwargs)

class Product(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    slug = models.SlugField(unique=True,blank=True)
    image = models.ImageField(upload_to='Product_imges', blank=True , null=True)
    featured = models.BooleanField(default=True)
    category = models.ForeignKey(Category , on_delete=models.SET_NULL , related_name='Product' ,blank=True , null=True)

    def __str__(self):
        return self.name
    
    def save(self , *args, **kwargs):

        if not self.slug:
            self.slug = slugify(self.name)
            unique_slug = self.slug
            counter = 1
            if Product.objects.filter(slug=unique_slug).exists():
                unique_slug = f"{self.slug}-{counter}"
                counter += 1
            self.slug = unique_slug
        super().save(*args, **kwargs)


class Cart(models.Model):
    cart_code = models.CharField(max_length=15, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.cart_code
    
class CartItem(models.Model):
    cart = models.ForeignKey(Cart ,on_delete=models.CASCADE, related_name="cartitems")
    product = models.ForeignKey(Product , on_delete=models.CASCADE , related_name="item")
    quantity = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in cart {self.cart.cart_code}"
    

class Review(models.Model):

    RATING_CHOIES = [
        (1,'1 - Poor'),
        (2,'2 - Fait'),
        (3,'3 - Good'),
        (4,'4 - Very Good'),
        (5,'5 - Excellent')
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE , related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL , on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveIntegerField(choices= RATING_CHOIES)
    review = models.TextField()
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s review on {self.product.name}"
    
    class Meta:
        unique_together = ["user", "product"]
        ordering = ["-created"]

    
class ProductRating(models.Model):
    product = models.OneToOneField(Product , on_delete=models.CASCADE , related_name="rating")
    average_rating = models.FloatField(default=0.0) 
    total_reviews = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.product.name} - {self.average_rating} ({self.total_reviews} reviews)"

class WishList(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL , on_delete=models.CASCADE, related_name="wishlist")
    product = models.ForeignKey(Product, on_delete=models.CASCADE , related_name="wishlist")
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "product"]

    def __str__(self):
        return f"{self.user.username} - {self.product.name} "


class Order(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("CARD", "Card"),
        ("COD", "Cash on Delivery"),
    ]
    PAYMENT_STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Paid", "Paid"),
    ]
    DELIVERY_STATUS_CHOICES = [
        ("Processing", "Processing"),
        ("Shipped", "Shipped"),
        ("Out for Delivery", "Out for Delivery"),
        ("Delivered", "Delivered"),
    ]

    order_id = models.CharField(max_length=32, unique=True, blank=True)
    strip_checkout_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=10,decimal_places=2)
    currency = models.CharField(max_length=10, default="inr")
    customer_email = models.EmailField()
    buyer_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address_line = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default="CARD")
    status = models.CharField(max_length=25, choices=PAYMENT_STATUS_CHOICES, default="Pending")
    delivery_status = models.CharField(max_length=30, choices=DELIVERY_STATUS_CHOICES, default="Processing")
    is_received = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.order_id:
            self.order_id = f"ORD-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="gallery")
    image = models.ImageField(upload_to='Product_imges', blank=False, null=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]

    def clean(self):
        if not self.product_id:
            return
        existing = ProductImage.objects.filter(product_id=self.product_id).exclude(id=self.id).count()
        if existing >= 12:
            raise ValidationError("A product can have a maximum of 12 extra images.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} image"
    
class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"Order {self.product.name} - {self.order.order_id}"


from django.db import models

class Carousel(models.Model):
    title = models.CharField(max_length=100, blank=True)
    image = models.ImageField(upload_to="carousel/")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Carousel {self.id}"
