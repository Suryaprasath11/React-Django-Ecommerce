from django.conf import settings
from django.urls import path
from . import views
from django.conf.urls.static import static

urlpatterns = [
    path("auth/google/config/", views.google_oauth_config, name="google_oauth_config"),
    path("auth/register/", views.register_user, name="register_user"),
    path("auth/login/", views.login_user, name="login_user"),
    path("auth/google/", views.google_login, name="google_login"),
    
    path("reviews/<int:product_id>/", views.product_reviews, name="product_reviews"),
    path("cart/<str:cart_code>/", views.cart_detail, name="cart_detail"),
    path("product/", views.product_list,name='product_list'),
    path("product_details/<slug:slug>", views.product_details,name='product_details'),

    path("carousel/", views.carousel_images, name="carousel"),

    path("categories/", views.category_list,name='category_list'),
    path("category_detail/<slug:slug>", views.category_detail,name='category_detail'),

    path("add_to_cart/",views.add_to_cart, name="add_to_cart"),
    path("update_cartitem_quantity/",views.update_cartitem_quantity, name="update_cartitem_quantity"),
    path("delete_cart_item/<int:pk>/",views.delete_cart_item, name="delete_cart_item"),

    path("add_review/",views.add_review, name="add_review"),
    path("update_review/<int:pk>/",views.update_review, name="update_review"),
    path("delete_review/<int:pk>/",views.delete_review, name="delete_review"),


    path("wishlist_item/",views.wishlist_item, name="wishlist_item"),
    path("add_to_wishlist/",views.add_to_wishlist, name="add_to_wishlist"),
    
    path("search",views.product_search, name="search"),

    path("checkout/",views.create_checkout_session, name="checkout"),
    path("place_order/", views.place_order, name="place_order"),
    path("orders/", views.my_orders, name="my_orders"),
    path("orders/track/<str:order_id>/", views.track_order, name="track_order"),
    path("orders/<str:order_id>/received/", views.mark_order_received, name="mark_order_received"),
    path("checkout/finalize/", views.finalize_checkout, name="finalize_checkout"),

    path("webhook/",views.my_webhook_view, name="webhook"),
]


if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
