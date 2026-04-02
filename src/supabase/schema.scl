create table "public"."addresses" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid not null,
    "building_no" text not null default ''::text,
    "street" text not null default ''::text,
    "city" text not null default ''::text,
    "zip_code" text default ''::text,
    "province" text not null,
    "created_at" timestamp with time zone default now(),
    "name" text not null,
    "is_active" boolean not null default true
      );
alter table "public"."addresses" enable row level security;
create table "public"."customers" (
    "id" uuid not null,
    "first_name" text not null default ''::text,
    "last_name" text not null default ''::text,
    "created_at" timestamp with time zone not null default now()
      );
alter table "public"."customers" enable row level security;
create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "service_item_id" uuid not null,
    "quantity" integer default 1,
    "unit_price" numeric not null
      );
alter table "public"."order_items" enable row level security;
create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "customer_id" uuid not null,
    "address_id" uuid,
    "service_type_id" uuid not null,
    "weight_kg" numeric,
    "total_amount" numeric not null,
    "order_status" text not null default 'Pending'::text,
    "payment_status" text not null default 'Unpaid'::text,
    "date" timestamp with time zone not null default now(),
    "order_method" text not null default 'Walk-in'::text,
    "is_accepted" boolean default false,
    "sms_sent" boolean default false,
    "payment_proof_url" text,
    "delivery_fee" numeric
      );
alter table "public"."orders" enable row level security;
create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "amount_paid" numeric not null,
    "payment_method" text not null default ''::text,
    "payment_date" timestamp with time zone not null default now()
      );
alter table "public"."payments" enable row level security;
create table "public"."profiles" (
    "id" uuid not null default auth.uid(),
    "email" text not null,
    "role" text not null default 'customer'::text,
    "created_at" timestamp with time zone not null default now()
      );
alter table "public"."profiles" enable row level security;
create table "public"."service_items" (
    "id" uuid not null default gen_random_uuid(),
    "service_type_id" uuid not null,
    "item_name" text not null,
    "price" numeric not null
      );
alter table "public"."service_items" enable row level security;
create table "public"."service_types" (
    "id" uuid not null default gen_random_uuid(),
    "service_name" text not null default ''::text,
    "base_price" numeric default 165.00,
    "pricing_model" text not null default ''::text
      );
alter table "public"."service_types" enable row level security;
CREATE UNIQUE INDEX addresses_pkey ON public.addresses USING btree (id);
CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);
CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);
CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);
CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX service_items_pkey ON public.service_items USING btree (id);
CREATE UNIQUE INDEX service_pkey ON public.service_types USING btree (id);
alter table "public"."addresses" add constraint "addresses_pkey" PRIMARY KEY using index "addresses_pkey";
alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";
alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";
alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";
alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";
alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";
alter table "public"."service_items" add constraint "service_items_pkey" PRIMARY KEY using index "service_items_pkey";
alter table "public"."service_types" add constraint "service_pkey" PRIMARY KEY using index "service_pkey";
alter table "public"."addresses" add constraint "addresses_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE not valid;
alter table "public"."addresses" validate constraint "addresses_customer_id_fkey";
alter table "public"."customers" add constraint "customers_id_fkey" FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;
alter table "public"."customers" validate constraint "customers_id_fkey";
alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;
alter table "public"."order_items" validate constraint "order_items_order_id_fkey";
alter table "public"."order_items" add constraint "order_items_service_item_id_fkey" FOREIGN KEY (service_item_id) REFERENCES public.service_items(id) ON DELETE RESTRICT not valid;
alter table "public"."order_items" validate constraint "order_items_service_item_id_fkey";
alter table "public"."orders" add constraint "orders_address_id_fkey" FOREIGN KEY (address_id) REFERENCES public.addresses(id) not valid;
alter table "public"."orders" validate constraint "orders_address_id_fkey";
alter table "public"."orders" add constraint "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) not valid;
alter table "public"."orders" validate constraint "orders_customer_id_fkey";
alter table "public"."orders" add constraint "orders_service_type_id_fkey" FOREIGN KEY (service_type_id) REFERENCES public.service_types(id) not valid;
alter table "public"."orders" validate constraint "orders_service_type_id_fkey";
alter table "public"."payments" add constraint "payment_method_check" CHECK ((payment_method = ANY (ARRAY['Cash'::text, 'GCash'::text]))) not valid;
alter table "public"."payments" validate constraint "payment_method_check";
alter table "public"."payments" add constraint "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;
alter table "public"."payments" validate constraint "payments_order_id_fkey";
alter table "public"."service_items" add constraint "service_items_service_type_id_fkey" FOREIGN KEY (service_type_id) REFERENCES public.service_types(id) ON DELETE RESTRICT not valid;
alter table "public"."service_items" validate constraint "service_items_service_type_id_fkey";
grant delete on table "public"."addresses" to "anon";
grant insert on table "public"."addresses" to "anon";
grant references on table "public"."addresses" to "anon";
grant select on table "public"."addresses" to "anon";
grant trigger on table "public"."addresses" to "anon";
grant truncate on table "public"."addresses" to "anon";
grant update on table "public"."addresses" to "anon";
grant delete on table "public"."addresses" to "authenticated";
grant insert on table "public"."addresses" to "authenticated";
grant references on table "public"."addresses" to "authenticated";
grant select on table "public"."addresses" to "authenticated";
grant trigger on table "public"."addresses" to "authenticated";
grant truncate on table "public"."addresses" to "authenticated";
grant update on table "public"."addresses" to "authenticated";
grant delete on table "public"."addresses" to "service_role";
grant insert on table "public"."addresses" to "service_role";
grant references on table "public"."addresses" to "service_role";
grant select on table "public"."addresses" to "service_role";
grant trigger on table "public"."addresses" to "service_role";
grant truncate on table "public"."addresses" to "service_role";
grant update on table "public"."addresses" to "service_role";
grant delete on table "public"."customers" to "anon";
grant insert on table "public"."customers" to "anon";
grant references on table "public"."customers" to "anon";
grant select on table "public"."customers" to "anon";
grant trigger on table "public"."customers" to "anon";
grant truncate on table "public"."customers" to "anon";
grant update on table "public"."customers" to "anon";
grant delete on table "public"."customers" to "authenticated";
grant insert on table "public"."customers" to "authenticated";
grant references on table "public"."customers" to "authenticated";
grant select on table "public"."customers" to "authenticated";
grant trigger on table "public"."customers" to "authenticated";
grant truncate on table "public"."customers" to "authenticated";
grant update on table "public"."customers" to "authenticated";
grant delete on table "public"."customers" to "service_role";
grant insert on table "public"."customers" to "service_role";
grant references on table "public"."customers" to "service_role";
grant select on table "public"."customers" to "service_role";
grant trigger on table "public"."customers" to "service_role";
grant truncate on table "public"."customers" to "service_role";
grant update on table "public"."customers" to "service_role";
grant delete on table "public"."order_items" to "anon";
grant insert on table "public"."order_items" to "anon";
grant references on table "public"."order_items" to "anon";
grant select on table "public"."order_items" to "anon";
grant trigger on table "public"."order_items" to "anon";
grant truncate on table "public"."order_items" to "anon";
grant update on table "public"."order_items" to "anon";
grant delete on table "public"."order_items" to "authenticated";
grant insert on table "public"."order_items" to "authenticated";
grant references on table "public"."order_items" to "authenticated";
grant select on table "public"."order_items" to "authenticated";
grant trigger on table "public"."order_items" to "authenticated";
grant truncate on table "public"."order_items" to "authenticated";
grant update on table "public"."order_items" to "authenticated";
grant delete on table "public"."order_items" to "service_role";
grant insert on table "public"."order_items" to "service_role";
grant references on table "public"."order_items" to "service_role";
grant select on table "public"."order_items" to "service_role";
grant trigger on table "public"."order_items" to "service_role";
grant truncate on table "public"."order_items" to "service_role";
grant update on table "public"."order_items" to "service_role";
grant delete on table "public"."orders" to "anon";
grant insert on table "public"."orders" to "anon";
grant references on table "public"."orders" to "anon";
grant select on table "public"."orders" to "anon";
grant trigger on table "public"."orders" to "anon";
grant truncate on table "public"."orders" to "anon";
grant update on table "public"."orders" to "anon";
grant delete on table "public"."orders" to "authenticated";
grant insert on table "public"."orders" to "authenticated";
grant references on table "public"."orders" to "authenticated";
grant select on table "public"."orders" to "authenticated";
grant trigger on table "public"."orders" to "authenticated";
grant truncate on table "public"."orders" to "authenticated";
grant update on table "public"."orders" to "authenticated";
grant delete on table "public"."orders" to "service_role";
grant insert on table "public"."orders" to "service_role";
grant references on table "public"."orders" to "service_role";
grant select on table "public"."orders" to "service_role";
grant trigger on table "public"."orders" to "service_role";
grant truncate on table "public"."orders" to "service_role";
grant update on table "public"."orders" to "service_role";
grant delete on table "public"."payments" to "anon";
grant insert on table "public"."payments" to "anon";
grant references on table "public"."payments" to "anon";
grant select on table "public"."payments" to "anon";
grant trigger on table "public"."payments" to "anon";
grant truncate on table "public"."payments" to "anon";
grant update on table "public"."payments" to "anon";
grant delete on table "public"."payments" to "authenticated";
grant insert on table "public"."payments" to "authenticated";
grant references on table "public"."payments" to "authenticated";
grant select on table "public"."payments" to "authenticated";
grant trigger on table "public"."payments" to "authenticated";
grant truncate on table "public"."payments" to "authenticated";
grant update on table "public"."payments" to "authenticated";
grant delete on table "public"."payments" to "service_role";
grant insert on table "public"."payments" to "service_role";
grant references on table "public"."payments" to "service_role";
grant select on table "public"."payments" to "service_role";
grant trigger on table "public"."payments" to "service_role";
grant truncate on table "public"."payments" to "service_role";
grant update on table "public"."payments" to "service_role";
grant delete on table "public"."profiles" to "anon";
grant insert on table "public"."profiles" to "anon";
grant references on table "public"."profiles" to "anon";
grant select on table "public"."profiles" to "anon";
grant trigger on table "public"."profiles" to "anon";
grant truncate on table "public"."profiles" to "anon";
grant update on table "public"."profiles" to "anon";
grant delete on table "public"."profiles" to "authenticated";
grant insert on table "public"."profiles" to "authenticated";
grant references on table "public"."profiles" to "authenticated";
grant select on table "public"."profiles" to "authenticated";
grant trigger on table "public"."profiles" to "authenticated";
grant truncate on table "public"."profiles" to "authenticated";
grant update on table "public"."profiles" to "authenticated";
grant delete on table "public"."profiles" to "service_role";
grant insert on table "public"."profiles" to "service_role";
grant references on table "public"."profiles" to "service_role";
grant select on table "public"."profiles" to "service_role";
grant trigger on table "public"."profiles" to "service_role";
grant truncate on table "public"."profiles" to "service_role";
grant update on table "public"."profiles" to "service_role";
grant delete on table "public"."service_items" to "anon";
grant insert on table "public"."service_items" to "anon";
grant references on table "public"."service_items" to "anon";
grant select on table "public"."service_items" to "anon";
grant trigger on table "public"."service_items" to "anon";
grant truncate on table "public"."service_items" to "anon";
grant update on table "public"."service_items" to "anon";
grant delete on table "public"."service_items" to "authenticated";
grant insert on table "public"."service_items" to "authenticated";
grant references on table "public"."service_items" to "authenticated";
grant select on table "public"."service_items" to "authenticated";
grant trigger on table "public"."service_items" to "authenticated";
grant truncate on table "public"."service_items" to "authenticated";
grant update on table "public"."service_items" to "authenticated";
grant delete on table "public"."service_items" to "service_role";
grant insert on table "public"."service_items" to "service_role";
grant references on table "public"."service_items" to "service_role";
grant select on table "public"."service_items" to "service_role";
grant trigger on table "public"."service_items" to "service_role";
grant truncate on table "public"."service_items" to "service_role";
grant update on table "public"."service_items" to "service_role";
grant delete on table "public"."service_types" to "anon";
grant insert on table "public"."service_types" to "anon";
grant references on table "public"."service_types" to "anon";
grant select on table "public"."service_types" to "anon";
grant trigger on table "public"."service_types" to "anon";
grant truncate on table "public"."service_types" to "anon";
grant update on table "public"."service_types" to "anon";
grant delete on table "public"."service_types" to "authenticated";
grant insert on table "public"."service_types" to "authenticated";
grant references on table "public"."service_types" to "authenticated";
grant select on table "public"."service_types" to "authenticated";
grant trigger on table "public"."service_types" to "authenticated";
grant truncate on table "public"."service_types" to "authenticated";
grant update on table "public"."service_types" to "authenticated";
grant delete on table "public"."service_types" to "service_role";
grant insert on table "public"."service_types" to "service_role";
grant references on table "public"."service_types" to "service_role";
grant select on table "public"."service_types" to "service_role";
grant trigger on table "public"."service_types" to "service_role";
grant truncate on table "public"."service_types" to "service_role";
grant update on table "public"."service_types" to "service_role";
create policy "Users can delete their own addresses"
  on "public"."addresses"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = customer_id));
create policy "Users can insert their own addresses"
  on "public"."addresses"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = customer_id));
create policy "Users can update their own address"
  on "public"."addresses"
  as permissive
  for update
  to authenticated
using ((auth.uid() = customer_id))
with check ((auth.uid() = customer_id));
create policy "Users can view their own addresses"
  on "public"."addresses"
  as permissive
  for select
  to authenticated
using ((auth.uid() = customer_id));
create policy "admins can view all rows"
  on "public"."addresses"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "Allow users to insert their own customer data"
  on "public"."customers"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));
create policy "admins can view all customers"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "customers can insert their own row"
  on "public"."customers"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));
create policy "customers can update their own row"
  on "public"."customers"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));
create policy "customers can view their own row"
  on "public"."customers"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));
create policy "Admins full access order_items"
  on "public"."order_items"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "Customers can delete their own order items"
  on "public"."order_items"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.customer_id = auth.uid())))));
create policy "Customers can insert their order items"
  on "public"."order_items"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.customer_id = auth.uid())))));
create policy "Customers can select their order items"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.customer_id = auth.uid())))));
create policy "Customers can update their order items"
  on "public"."order_items"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.customer_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.customer_id = auth.uid())))));
create policy "admins can update orders"
  on "public"."orders"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "admins can view all orders"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "customers can delete own orders"
  on "public"."orders"
  as permissive
  for delete
  to authenticated
using ((customer_id = auth.uid()));
create policy "customers can insert own orders"
  on "public"."orders"
  as permissive
  for insert
  to authenticated
with check ((customer_id = auth.uid()));
create policy "customers can select own orders"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using ((customer_id = auth.uid()));
create policy "customers can update their own orders"
  on "public"."orders"
  as permissive
  for update
  to authenticated
using ((customer_id = auth.uid()))
with check ((customer_id = auth.uid()));
create policy "Admins can view payments"
  on "public"."payments"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "Allow customers to insert payment rows"
  on "public"."payments"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = payments.order_id) AND (orders.customer_id = auth.uid())))));
create policy "Allow customers to update their payments"
  on "public"."payments"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = payments.order_id) AND (orders.customer_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = payments.order_id) AND (orders.customer_id = auth.uid())))));
create policy "Allow customers to view their payments"
  on "public"."payments"
  as permissive
  for select
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.customer_id = auth.uid()))));
create policy "Allow users to insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));
create policy "Users can create their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));
create policy "Users can view their own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));
create policy "Admins full access service_items"
  on "public"."service_items"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "Customers can read service items"
  on "public"."service_items"
  as permissive
  for select
  to authenticated
using (true);
create policy "Allow select for all"
  on "public"."service_types"
  as permissive
  for select
  to authenticated
using (true);
create policy "Allow authenticated uploads 1jmfb48_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'payment_proofs'::text));
create policy "Allow public viewing 1jmfb48_0"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'payment_proofs'::text));
create policy "Customers can upload to own folder 1jmfb48_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'payment_proofs'::text) AND (auth.uid() = (split_part(name, '/'::text, 1))::uuid)));
