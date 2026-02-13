from rest_framework import serializers
from .models import Product, ProductImage, Category , CartItem , Cart, Review, WishList , Carousel, Order, OrderItem
from django.contrib.auth import get_user_model

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "position"]

class ProductListSerializer(serializers.ModelSerializer):
    display_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'image', 'display_image', 'price']

    def get_display_image(self, product):
        if product.image:
            return product.image.url if hasattr(product.image, "url") else product.image
        first_gallery = product.gallery.first()
        if first_gallery and first_gallery.image:
            return first_gallery.image.url if hasattr(first_gallery.image, "url") else first_gallery.image
        return None

class ProductDetailSerializer(serializers.ModelSerializer):
    gallery = ProductImageSerializer(many=True, read_only=True)
    display_image = serializers.SerializerMethodField()
    all_images = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'image', 'display_image', 'all_images', 'gallery', 'price']

    def get_display_image(self, product):
        if product.image:
            return product.image.url if hasattr(product.image, "url") else product.image
        first_gallery = product.gallery.first()
        if first_gallery and first_gallery.image:
            return first_gallery.image.url if hasattr(first_gallery.image, "url") else first_gallery.image
        return None

    def get_all_images(self, product):
        urls = []
        if product.image:
            urls.append(product.image.url if hasattr(product.image, "url") else product.image)
        gallery_items = product.gallery.all()
        for item in gallery_items:
            if item.image:
                url = item.image.url if hasattr(item.image, "url") else item.image
                if url not in urls:
                    urls.append(url)
        return urls

class CategoryListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'image', 'slug']

class CategoryDetailSerializer(serializers.ModelSerializer):
    Product = ProductListSerializer(many=True, read_only=True)
    class Meta:
        model = Category
        fields = ['id', 'name', 'image', 'Product']

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    sub_total = serializers.SerializerMethodField()
    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'sub_total']
    
    def get_sub_total(self , cartitem):
        total = cartitem.product.price * cartitem.quantity
        return total

class CartSerializer(serializers.ModelSerializer):
    cartitems = CartItemSerializer(read_only=True, many=True)
    cart_total = serializers.SerializerMethodField()
    class Meta:
        model = Cart
        fields = ["id","cart_code","cartitems","cart_total"]

    def get_cart_total(self, cart):
        items = cart.cartitems.all()
        total = sum([item.quantity * item.product.price for item in items])
        return total

class CartStartSerializer(serializers.ModelSerializer):
    total_quantity = serializers.SerializerMethodField()
    class Meta:
        model = Cart
        fields = ["id","cart_code","total_quantity"]

    def get_total_quantity(self, cart):
        items = cart.cartitems.all()
        total = sum([item.quantity for item in items])
        return total

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["id","email","first_name","last_name","profile_picture_url"]


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ["first_name", "last_name", "profile_picture_url"]

class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only= True)
    class Meta:
        model = Review
        fields = ["id","user" ,"rating","review","created","updated"]

class WishListSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    product = ProductListSerializer(read_only=True)
    class Meta:
        model = WishList
        fields = ["id","user","product","created"]


class CarouselSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True)

    class Meta:
        model = Carousel
        fields = ["id", "title", "image"]


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "unit_price"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_id",
            "strip_checkout_id",
            "subtotal",
            "delivery_charge",
            "amount",
            "currency",
            "customer_email",
            "buyer_name",
            "phone",
            "address_line",
            "city",
            "state",
            "postal_code",
            "country",
            "payment_method",
            "status",
            "delivery_status",
            "is_received",
            "created_at",
            "items",
        ]
