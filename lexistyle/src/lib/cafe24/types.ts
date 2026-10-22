// filepath: src/lib/cafe24/types.ts
export type Cafe24Product = {
  product_no: number;
  product_code?: string;
  custom_product_code?: string | null;
  product_name: string;
  price: string | number;
  retail_price?: string | number;
  price_excluding_tax?: string | number;
  summary_description?: string | null;
  detail_image?: string | null;
  list_image?: string | null;
  tiny_image?: string | null;
  small_image?: string | null;
  brand_code?: string | null;
  brand_name?: string | null;
  category?: Array<{ category_no?: number; category_name?: string }> | null;
  display?: string;
  selling?: string;
  sold_out?: string;
  discount_price?: string | number | null;
};

export type Cafe24ProductsResponse = {
  products?: Cafe24Product[];
  product?: Cafe24Product;
};

export type Cafe24CartItem = {
  basket_product_no?: number;
  product_no: number;
  product_name?: string;
  quantity: number;
  price?: string | number;
  option_id?: string;
  variant_code?: string;
};

export type Cafe24CartsResponse = {
  carts?: Cafe24CartItem[];
};
