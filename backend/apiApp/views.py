from django.shortcuts import render

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Carousel, Order, OrderItem, Product , Category , Cart , CartItem, Review, WishList

from .serializers import CarouselSerializer, CartItemSerializer, CartSerializer, OrderSerializer, ProductListSerializer , ProductDetailSerializer , CategoryDetailSerializer , CategoryListSerializer, ReviewSerializer, WishListSerializer, UserSerializer, UserUpdateSerializer

from django.conf import settings

from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.template.loader import render_to_string
from django.core.mail import EmailMessage

from django.db.models import Q
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
import random

import stripe  # type: ignore   to suppers the warning
import requests

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.utils import timezone
import logging
    



User = get_user_model()
endpoint_secret = settings.WEB_HOOK_SECRET_KEY
stripe.api_key = settings.STRIPE_SECRET_KEY
DEFAULT_DELIVERY_CHARGE = Decimal("280.00")
DEFAULT_CURRENCY = "inr"
logger = logging.getLogger(__name__)


def _serialize_user(user):
    return UserSerializer(user).data


def _to_decimal(value, fallback=Decimal("0.00")):
    try:
        return Decimal(str(value))
    except Exception:
        return fallback


def _quantize_money(value):
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _generate_otp():
    return f"{random.randint(0, 999999):06d}"


def _send_order_confirmation_email(order):
    from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER
    if not from_email:
        raise ValueError("Sender email is not configured on server.")

    html = render_to_string("emails/order_confermation.html", {
        "name": order.buyer_name or "Customer",
        "order_id": order.order_id,
        "total": order.amount,
        "payment_method": order.payment_method,
    })

    email = EmailMessage(
        subject=f"Your Madstore Order is Confirmed - {order.order_id}",
        body=html,
        from_email=from_email,
        to=[order.customer_email],
    )
    email.content_subtype = "html"
    email.send(fail_silently=False)


def _build_order_data(request):
    data = request.data or {}
    return {
        "email": (data.get("email") or "").strip().lower(),
        "buyer_name": (data.get("buyer_name") or "").strip(),
        "phone": (data.get("phone") or "").strip(),
        "address_line": (data.get("address_line") or "").strip(),
        "city": (data.get("city") or "").strip(),
        "state": (data.get("state") or "").strip(),
        "postal_code": (data.get("postal_code") or "").strip(),
        "country": (data.get("country") or "").strip(),
        "payment_method": (data.get("payment_method") or "CARD").strip().upper(),
    }


def _create_order_from_cart(cart, order_data, strip_checkout_id=None, status_value=None):
    subtotal = _quantize_money(
        sum(
            _to_decimal(item.product.price) * item.quantity
            for item in cart.cartitems.select_related("product").all()
        )
    )
    delivery_charge = DEFAULT_DELIVERY_CHARGE if subtotal > 0 else Decimal("0.00")
    total_amount = _quantize_money(subtotal + delivery_charge)

    payment_method = order_data.get("payment_method", "CARD")
    effective_status = status_value or ("Pending" if payment_method == "COD" else "Paid")

    order = Order.objects.create(
        strip_checkout_id=strip_checkout_id,
        subtotal=subtotal,
        delivery_charge=delivery_charge,
        amount=total_amount,
        currency=DEFAULT_CURRENCY,
        customer_email=order_data.get("email", ""),
        buyer_name=order_data.get("buyer_name", ""),
        phone=order_data.get("phone", ""),
        address_line=order_data.get("address_line", ""),
        city=order_data.get("city", ""),
        state=order_data.get("state", ""),
        postal_code=order_data.get("postal_code", ""),
        country=order_data.get("country", ""),
        payment_method=payment_method,
        status=effective_status,
        delivery_status="Processing",
        is_received=False,
    )

    for item in cart.cartitems.select_related("product").all():
        OrderItem.objects.create(
            order=order,
            product=item.product,
            quantity=item.quantity,
            unit_price=_quantize_money(_to_decimal(item.product.price)),
        )
    return order


@api_view(['GET'])
def google_oauth_config(request):
    allowed_origins = getattr(settings, "GOOGLE_OAUTH_ALLOWED_ORIGINS", [])
    request_origin = (request.headers.get("Origin") or "").rstrip("/")
    if allowed_origins and request_origin and request_origin not in allowed_origins:
        return Response({"client_id": ""}, status=status.HTTP_200_OK)
    return Response(
        {"client_id": settings.GOOGLE_OAUTH_CLIENT_ID or ""},
        status=status.HTTP_200_OK,
    )


def _verify_google_id_token(id_token):
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise ValueError("Google OAuth is not configured on the server.")

    try:
        response = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
            timeout=8,
        )
    except requests.RequestException as exc:
        raise ValueError("Could not reach Google token verification endpoint.") from exc

    if response.status_code != 200:
        raise ValueError("Invalid Google token.")

    payload = response.json()
    issuer = payload.get("iss")
    audience = payload.get("aud")
    email_verified = payload.get("email_verified")

    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        raise ValueError("Invalid Google token issuer.")
    if audience != settings.GOOGLE_OAUTH_CLIENT_ID:
        raise ValueError("Google token audience mismatch.")
    if str(email_verified).lower() != "true":
        raise ValueError("Google email is not verified.")

    return payload


@api_view(['POST'])
def register_user(request):
    data = request.data or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"error": "An account with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(password)
    except ValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )

    return Response({"user": _serialize_user(user), "message": "Account created."}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def login_user(request):
    data = request.data or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=email, password=password)
    if not user:
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    return Response({"user": _serialize_user(user), "message": "Login successful."})


@api_view(['POST'])
def google_login(request):
    data = request.data or {}
    id_token = data.get("id_token")

    if not id_token:
        return Response({"error": "Google ID token is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = _verify_google_id_token(id_token)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

    email = (payload.get("email") or "").strip().lower()
    first_name = (payload.get("given_name") or "").strip()
    last_name = (payload.get("family_name") or "").strip()
    profile_picture_url = (payload.get("picture") or "").strip() or None

    if not email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email,
            "first_name": first_name,
            "last_name": last_name,
            "profile_picture_url": profile_picture_url,
        },
    )

    if not created:
        updated = False
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            updated = True
        if last_name and user.last_name != last_name:
            user.last_name = last_name
            updated = True
        if profile_picture_url and user.profile_picture_url != profile_picture_url:
            user.profile_picture_url = profile_picture_url
            updated = True
        if updated:
            user.save()

    return Response({"user": _serialize_user(user), "message": "Google login successful."})

@api_view(['GET'])
def product_list(request):
    product = Product.objects.all()
    serializer = ProductListSerializer(product , many=True)
    return Response(serializer.data)

@api_view(['GET'])
def product_details(request,slug):
    product = Product.objects.filter(slug=slug)
    serializer = ProductDetailSerializer(product , many=True)
    return Response(serializer.data)

@api_view(['GET'])
def category_list(request):
    categories = Category.objects.all()
    serializer = CategoryListSerializer(categories , many=True)
    return Response(serializer.data)

@api_view(['GET'])
def category_detail(request, slug):
    category = Category.objects.get(slug=slug)
    serializer = CategoryDetailSerializer(category)
    return Response(serializer.data)

@api_view(['GET'])
def carousel_images(request):
    product = Carousel.objects.filter(is_active=True)
    serializer = CarouselSerializer(product , many=True)
    return Response(serializer.data)


@api_view(['POST'])
def add_to_cart(request):
    cart_code = (request.data.get("cart_code") or "").strip()
    product_id = request.data.get("product_id")
    if not cart_code:
        return Response({"error": "cart_code is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not product_id:
        return Response({"error": "product_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

    cart, _ = Cart.objects.get_or_create(cart_code=cart_code)
    cartitem, created = CartItem.objects.get_or_create(product=product, cart=cart)
    if created:
        cartitem.quantity = 1
    else:
        cartitem.quantity += 1
    cartitem.save()

    serializer = CartSerializer(cart)
    return Response(serializer.data)


@api_view(['PUT'])
def update_cartitem_quantity(request):
    cartitem_id = request.data.get("item_id")
    quantity = request.data.get("quantity", 1)
    if not cartitem_id:
        return Response({"error": "item_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return Response({"error": "quantity must be a number."}, status=status.HTTP_400_BAD_REQUEST)
    if quantity < 1:
        return Response({"error": "quantity must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        cartitem = CartItem.objects.get(id=cartitem_id)
    except CartItem.DoesNotExist:
        return Response({"error": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

    cartitem.quantity = quantity
    cartitem.save()

    serializer = CartItemSerializer(cartitem)
    return Response({"data": serializer.data, "message": "Cart updated successfully."})

@api_view(["DELETE"])
def delete_cart_item(request,pk):
    try:
        cartitem = CartItem.objects.get(id=pk)
    except CartItem.DoesNotExist:
        return Response({"error": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)
    cartitem.delete()

    return Response({"message": "Cart item deleted successfully."}, status=204)


@api_view(["POST"])
def add_review(request):
    product_id = request.data.get("product_id")
    email = request.data.get("email")
    rating = request.data.get("rating")
    review_text = request.data.get("review")

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({"error": "Product not found."}, status=404)
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found. Please sign in."}, status=400)

    if Review.objects.filter(product=product, user=user).exists():
        return Response("You have already dropped a review", status=400)
    
    review = Review.objects.create(product=product, user=user, rating=rating,review=review_text)
    serializer = ReviewSerializer(review)
    return Response(serializer.data)

@api_view(["PUT"])
def update_review(request,pk):
    review = Review.objects.get(id=pk)
    rating = request.data.get("rating")
    review_text = request.data.get("review")

    review.rating = int(rating)
    review.review = review_text
    review.save()

    serializer = ReviewSerializer(review)
    return Response(serializer.data)

@api_view(["DELETE"])
def delete_review(request,pk):
    review = Review.objects.get(id=pk)
    review.delete()

    return Response("Review Deleted Successfully")

@api_view(['GET'])
def wishlist_item(request):
    email = request.query_params.get("email") or request.data.get("email")
    user = User.objects.get(email=email)

    product = WishList.objects.filter(user=user)

    serializer = WishListSerializer(product , many=True)
    return Response(serializer.data)

@api_view(["POST"])
def add_to_wishlist(request):
    email = request.data.get("email")
    product_id = request.data.get("product_id")

    user = User.objects.get(email=email)
    product = Product.objects.get(id=product_id)

    wishlist = WishList.objects.filter(user=user, product=product)
    if wishlist:
        wishlist.delete()
        return Response(f"Revomed {product.name} from the Wishlist", status=204)
    
    new_wishlist = WishList.objects.create(user=user ,product=product)
    serializer = WishListSerializer(new_wishlist)
    return Response(serializer.data)

@api_view(['GET'])
def product_search(request):
    query = request.query_params.get("query") 
    if not query:
        return Response("No query provided", status=400)
    
    products = Product.objects.filter(Q(name__icontains=query) | 
                                      Q(description__icontains=query) |
                                       Q(category__name__icontains=query) )
    serializer = ProductListSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def product_reviews(request, product_id):
    reviews = Review.objects.filter(product_id=product_id)
    serializer = ReviewSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def cart_detail(request, cart_code):
    cart, _ = Cart.objects.get_or_create(cart_code=cart_code)
    serializer = CartSerializer(cart)
    return Response(serializer.data)



@api_view(['POST'])
def create_checkout_session(request):
    cart_code = request.data.get("cart_code")
    order_data = _build_order_data(request)
    email = order_data["email"]
    if not email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

    payment_method = order_data["payment_method"]
    if payment_method == "COD":
        return place_order(request)

    cart = Cart.objects.get(cart_code=cart_code)
    subtotal = _quantize_money(
        sum(_to_decimal(item.product.price) * item.quantity for item in cart.cartitems.all())
    )
    delivery_charge = DEFAULT_DELIVERY_CHARGE if subtotal > 0 else Decimal("0.00")
    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email= email,
            payment_method_types=['card'],

            line_items=[
                {
                    'price_data': {
                        'currency': DEFAULT_CURRENCY,
                        'product_data': {'name': item.product.name},
                        'unit_amount': int(item.product.price * 100),  # Amount in cents
                    },
                    'quantity': item.quantity,
                }
                for item in cart.cartitems.all()
            ] + [
                {
                    'price_data': {
                        'currency': DEFAULT_CURRENCY,
                        'product_data': {'name': 'Delivery Charge'},
                        'unit_amount': int(delivery_charge * 100),
                    },
                    'quantity': 1,
                }
            ],
           
            mode='payment',
            success_url = f"{settings.FRONTEND_BASE_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url = f"{settings.FRONTEND_BASE_URL}/payment/failed",
            metadata = {
                "cart_code": cart_code,
                "buyer_name": order_data["buyer_name"],
                "phone": order_data["phone"],
                "address_line": order_data["address_line"],
                "city": order_data["city"],
                "state": order_data["state"],
                "postal_code": order_data["postal_code"],
                "country": order_data["country"],
                "payment_method": "CARD",
                "subtotal": str(subtotal),
                "delivery_charge": str(delivery_charge),
            }
        )
        return Response({'data': checkout_session})
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
def place_order(request):
    cart_code = request.data.get("cart_code")
    if not cart_code:
        return Response({"error": "cart_code is required."}, status=status.HTTP_400_BAD_REQUEST)

    order_data = _build_order_data(request)
    if not order_data["email"]:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not order_data["buyer_name"]:
        return Response({"error": "Buyer name is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not order_data["address_line"] or not order_data["city"] or not order_data["country"]:
        return Response(
            {"error": "Complete delivery address is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if order_data["payment_method"] not in ["CARD", "COD"]:
        return Response({"error": "Invalid payment method."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        cart = Cart.objects.get(cart_code=cart_code)
    except Cart.DoesNotExist:
        return Response({"error": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)

    if not cart.cartitems.exists():
        return Response({"error": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)
    
    order = _create_order_from_cart(cart, order_data)
    cart.delete()
    serializer = OrderSerializer(order)    mail_warning = None
    try:
        _send_order_confirmation_email(order)
    except Exception:
        logger.exception("Failed to send order confirmation email for order %s", order.order_id)
        mail_warning = "Order placed, but confirmation email could not be sent."

    return Response(
        {
            "message": "Order placed successfully.",
            "order": serializer.data,
            **({"mail_warning": mail_warning} if mail_warning else {}),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def track_order(request, order_id):
    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
    serializer = OrderSerializer(order)
    return Response(serializer.data)


@api_view(['GET'])
def my_orders(request):
    email = (request.query_params.get("email") or "").strip().lower()
    if not email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
    orders = (
        Order.objects.filter(customer_email=email)
        .prefetch_related("items__product")
        .order_by("-created_at")
    )
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def mark_order_received(request, order_id):
    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    order.is_received = True
    order.delivery_status = "Delivered"
    order.save(update_fields=["is_received", "delivery_status"])
    serializer = OrderSerializer(order)
    return Response({"message": "Order marked as received.", "order": serializer.data})


@api_view(['POST'])
def send_order_otp(request, order_id):
    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    provided_email = (request.data.get("email") or "").strip().lower()
    if not provided_email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
    if provided_email != (order.customer_email or "").strip().lower():
        return Response(
            {"error": "Email does not match this order."},
            status=status.HTTP_403_FORBIDDEN,
        )

    now = timezone.now()
    if order.otp_sent_at and (now - order.otp_sent_at).total_seconds() < 60:
        return Response(
            {"error": "Please wait before requesting OTP again."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    otp = _generate_otp()
    expiry = now + timedelta(minutes=10)

    if settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":
        return Response(
            {"error": "SMTP email is not configured. Please configure EMAIL_HOST_USER and EMAIL_HOST_PASSWORD."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    custom_from_email = (request.data.get("from_email") or "").strip()
    from_email = custom_from_email or settings.OTP_FROM_EMAIL or settings.DEFAULT_FROM_EMAIL
    if not from_email:
        return Response(
            {"error": "Sender email is not configured on server."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    subject = f"Madstore OTP for order {order.order_id}"
    custom_message = (request.data.get("custom_message") or "").strip()
    if custom_message:
        message = custom_message.replace("{otp}", otp).replace("{order_id}", order.order_id)
    else:
        message = (
            f"Hello {order.buyer_name or 'Customer'},\n\n"
            f"Your OTP for order {order.order_id} is: {otp}\n"
            "This OTP is valid for 10 minutes.\n\n"
            "If you did not request this, please ignore this email.\n\n"
            "Thanks,\nMadstore"
        )

    try:
        html_message = render_to_string("emails/otp_mail.html", {
            "otp": otp,
            "order_id": order.order_id,
            "name": order.buyer_name or "Customer",
        })
        email = EmailMessage(
            subject=subject,
            body=html_message,
            from_email=from_email,
            to=[order.customer_email],
        )

        email.content_subtype = "html"
        email.send()

    except Exception as exc:
        return Response(
            {"error": f"Failed to send OTP email: {str(exc)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    order.otp_code = otp
    order.otp_sent_at = now
    order.otp_expires_at = expiry
    order.save(update_fields=["otp_code", "otp_sent_at", "otp_expires_at"])

    return Response(
        {
            "message": "OTP sent to customer email.",
            "order_id": order.order_id,
            "expires_at": expiry.isoformat(),
        }
    )


@api_view(['POST'])
def verify_order_delivery_otp(request, order_id):
    try:
        order = Order.objects.get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

    provided_email = (request.data.get("email") or "").strip().lower()
    provided_otp = (request.data.get("otp") or "").strip()

    if not provided_email:
        return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
    if provided_email != (order.customer_email or "").strip().lower():
        return Response({"error": "Email does not match this order."}, status=status.HTTP_403_FORBIDDEN)

    if not provided_otp:
        return Response({"error": "OTP is required."}, status=status.HTTP_400_BAD_REQUEST)
    if len(provided_otp) != 6 or not provided_otp.isdigit():
        return Response({"error": "OTP must be a 6-digit code."}, status=status.HTTP_400_BAD_REQUEST)

    if order.delivery_status == "Delivered" or order.is_received:
        serializer = OrderSerializer(order)
        return Response({"message": "Order is already delivered.", "order": serializer.data})

    if not order.otp_code:
        return Response({"error": "No OTP found for this order. Please request OTP first."}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    if order.otp_expires_at and now > order.otp_expires_at:
        return Response({"error": "OTP expired. Please request a new OTP."}, status=status.HTTP_400_BAD_REQUEST)

    if provided_otp != order.otp_code:
        return Response({"error": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

    order.delivery_status = "Delivered"
    order.status = "Paid"
    order.is_received = True
    order.otp_code = ""
    order.otp_sent_at = None
    order.otp_expires_at = None
    order.save(
        update_fields=[
            "delivery_status",
            "is_received",
            "otp_code",
            "otp_sent_at",
            "otp_expires_at",
            'status',
        ]
    )

    serializer = OrderSerializer(order)
    return Response({"message": "Order marked as delivered.", "order": serializer.data})



@csrf_exempt
def my_webhook_view(request):
  payload = request.body
  sig_header = request.META['HTTP_STRIPE_SIGNATURE']
  event = None

  try:
    event = stripe.Webhook.construct_event(
      payload, sig_header, endpoint_secret
    )
  except ValueError as e:
    return HttpResponse(status=400)
  
  except stripe.error.SignatureVerificationError as e:
    return HttpResponse(status=400)

  if (
    event['type'] == 'checkout.session.completed'
    or event['type'] == 'checkout.session.async_payment_succeeded'
  ):
    session = event['data']['object']

    metadata = session.get("metadata", {})
    cart_code = metadata.get("cart_code")

    fulfill_checkout(session, cart_code, metadata)


  return HttpResponse(status=200)



def fulfill_checkout(session, cart_code, metadata=None):
    metadata = metadata or {}
    try:
        cart = Cart.objects.get(cart_code=cart_code)
    except Cart.DoesNotExist:
        return

    order_data = {
        "email": (session.get("customer_email") or "").strip().lower(),
        "buyer_name": metadata.get("buyer_name", ""),
        "phone": metadata.get("phone", ""),
        "address_line": metadata.get("address_line", ""),
        "city": metadata.get("city", ""),
        "state": metadata.get("state", ""),
        "postal_code": metadata.get("postal_code", ""),
        "country": metadata.get("country", ""),
        "payment_method": metadata.get("payment_method", "CARD"),
    }

    order = _create_order_from_cart(
        cart=cart,
        order_data=order_data,
        strip_checkout_id=session.get("id"),
        status_value="Paid",
    )
    order.currency = session.get("currency", DEFAULT_CURRENCY)
    amount_total = _to_decimal(session.get("amount_total", 0)) / Decimal("100")
    order.amount = _quantize_money(amount_total)
    order.save(update_fields=["currency", "amount"])
    try:
        _send_order_confirmation_email(order)
    except Exception:
        logger.exception("Failed to send order confirmation email for order %s", order.order_id)
    cart.delete()


@api_view(['POST'])
def finalize_checkout(request):
    session_id = (request.data.get("session_id") or "").strip()
    if not session_id:
        return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    existing = Order.objects.filter(strip_checkout_id=session_id).first()
    if existing:
        serializer = OrderSerializer(existing)
        return Response({"order": serializer.data, "message": "Order already finalized."})

    metadata = session.get("metadata", {})
    cart_code = metadata.get("cart_code")
    if not cart_code:
        return Response({"error": "cart_code missing in session metadata."}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        fulfill_checkout(session, cart_code, metadata)

    created = Order.objects.filter(strip_checkout_id=session_id).first()
    serializer = OrderSerializer(created) if created else None
    return Response({"order": serializer.data if serializer else None, "message": "Order finalized."})

