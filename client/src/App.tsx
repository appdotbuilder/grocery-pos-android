
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/utils/trpc';
import type { 
  Product, 
  Category, 
  Transaction, 
  PriceVariant,
  CreateProductInput, 
  UpdateProductInput,
  CreateCategoryInput,
  CreatePriceVariantInput,
  CreateTransactionInput,
  SalesReportInput,
  SalesReport
} from '../../server/src/schema';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Scan, 
  CreditCard, 
  DollarSign,
  TrendingUp,
  Calendar,
  ShoppingBag,
  Receipt
} from 'lucide-react';

interface CartItem {
  product: Product;
  variant?: PriceVariant;
  quantity: number;
  discount: number;
}

function App() {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceVariants, setPriceVariants] = useState<Record<number, PriceVariant[]>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pos');

  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<number | null>(null);
  const [selectedProductForVariantSelection, setSelectedProductForVariantSelection] = useState<Product | null>(null);
  const [isVariantSelectionDialogOpen, setIsVariantSelectionDialogOpen] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState<CreateProductInput>({
    name: '',
    description: null,
    barcode: null,
    base_price: 0,
    stock_quantity: 0,
    category_id: null,
    is_active: true
  });

  const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
    name: '',
    description: null
  });

  const [variantForm, setVariantForm] = useState<CreatePriceVariantInput>({
    product_id: 0,
    variant_name: '',
    price: 0,
    is_default: false
  });

  // POS states
  const [barcodeInput, setBarcodeInput] = useState('');
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Report states
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Load data functions
  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const result = await trpc.getTransactions.query({
        limit: 50,
        offset: 0
      });
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  const loadPriceVariants = useCallback(async (productId: number) => {
    try {
      const result = await trpc.getPriceVariants.query({ product_id: productId });
      setPriceVariants((prev: Record<number, PriceVariant[]>) => ({
        ...prev,
        [productId]: result
      }));
    } catch (error) {
      console.error('Failed to load price variants:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadTransactions();
  }, [loadProducts, loadCategories, loadTransactions]);

  // Product management functions
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createProduct.mutate(productForm);
      setProducts((prev: Product[]) => [...prev, response]);
      setProductForm({
        name: '',
        description: null,
        barcode: null,
        base_price: 0,
        stock_quantity: 0,
        category_id: null,
        is_active: true
      });
      setIsProductDialogOpen(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsLoading(true);
    try {
      const updateData: UpdateProductInput = {
        id: editingProduct.id,
        ...productForm
      };
      const response = await trpc.updateProduct.mutate(updateData);
      setProducts((prev: Product[]) => 
        prev.map((p: Product) => p.id === response.id ? response : p)
      );
      setEditingProduct(null);
      setIsProductDialogOpen(false);
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await trpc.deleteProduct.mutate({ id: productId });
      setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== productId));
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.createCategory.mutate(categoryForm);
      setCategories((prev: Category[]) => [...prev, response]);
      setCategoryForm({ name: '', description: null });
      setIsCategoryDialogOpen(false);
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePriceVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariant) return;
    
    setIsLoading(true);
    try {
      const variantData = { ...variantForm, product_id: selectedProductForVariant };
      await trpc.createPriceVariant.mutate(variantData);
      await loadPriceVariants(selectedProductForVariant);
      setVariantForm({
        product_id: 0,
        variant_name: '',
        price: 0,
        is_default: false
      });
      setIsVariantDialogOpen(false);
    } catch (error) {
      console.error('Failed to create price variant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // POS functions
  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) return;
    
    try {
      const product = await trpc.getProductByBarcode.query({ barcode: barcodeInput });
      if (product) {
        addToCart(product);
        setBarcodeInput('');
      }
    } catch (error) {
      console.error('Product not found:', error);
    }
  };

  const addToCart = (product: Product, variant?: PriceVariant) => {
    setCart((prev: CartItem[]) => {
      const existingItem = prev.find((item: CartItem) => 
        item.product.id === product.id && 
        item.variant?.id === variant?.id
      );
      
      if (existingItem) {
        return prev.map((item: CartItem) => 
          item === existingItem 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...prev, { product, variant, quantity: 1, discount: 0 }];
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev: CartItem[]) => prev.filter((_, i) => i !== index));
  };

  const updateCartItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }
    
    setCart((prev: CartItem[]) => 
      prev.map((item: CartItem, i: number) => 
        i === index ? { ...item, quantity } : item
      )
    );
  };

  const calculateCartTotal = () => {
    const itemsTotal = cart.reduce((total, item) => {
      const price = item.variant?.price || item.product.base_price;
      return total + (price * item.quantity) - item.discount;
    }, 0);
    return itemsTotal + taxAmount - discountAmount;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setIsLoading(true);
    try {
      const transactionData: CreateTransactionInput = {
        items: cart.map((item: CartItem) => ({
          product_id: item.product.id,
          price_variant_id: item.variant?.id || null,
          quantity: item.quantity,
          discount_amount: item.discount
        })),
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        payments: [{
          payment_method: paymentMethod,
          amount: paymentAmount,
          reference_number: null
        }]
      };
      
      await trpc.createTransaction.mutate(transactionData);
      setCart([]);
      setTaxAmount(0);
      setDiscountAmount(0);
      setPaymentAmount(0);
      await loadTransactions();
    } catch (error) {
      console.error('Failed to process transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Report functions
  const generateReport = async () => {
    if (!reportStartDate || !reportEndDate) return;
    
    setIsLoading(true);
    try {
      const reportData: SalesReportInput = {
        start_date: new Date(reportStartDate).toISOString(),
        end_date: new Date(reportEndDate).toISOString(),
        report_type: reportType
      };
      
      const report = await trpc.generateSalesReport.query(reportData);
      setSalesReport(report);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      barcode: product.barcode,
      base_price: product.base_price,
      stock_quantity: product.stock_quantity,
      category_id: product.category_id,
      is_active: product.is_active
    });
    setIsProductDialogOpen(true);
  };

  const openVariantDialog = (productId: number) => {
    setSelectedProductForVariant(productId);
    setVariantForm({
      product_id: productId,
      variant_name: '',
      price: 0,
      is_default: false
    });
    setIsVariantDialogOpen(true);
    loadPriceVariants(productId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🛒 Toko Iis</h1>
          <p className="text-gray-600">Sistem Kasir Modern untuk Toko Iis</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Point of Sale
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Point of Sale Tab */}
          <TabsContent value="pos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Search & Cart */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scan className="w-5 h-5" />
                      Product Search
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Scan or enter barcode..."
                        value={barcodeInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
                      />
                      <Button onClick={handleBarcodeSearch}>
                        <Scan className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                      {products.filter((p: Product) => p.is_active).map((product: Product) => (
                        <Button
                          key={product.id}
                          variant="outline"
                          className="h-auto p-3 flex flex-col items-start"
                          onClick={() => {
                            setSelectedProductForVariantSelection(product);
                            setIsVariantSelectionDialogOpen(true);
                            loadPriceVariants(product.id); // Load variants when opening the dialog
                          }}
                        >
                          <span className="font-medium text-sm">{product.name}</span>
                          <span className="text-green-600 font-bold">{product.base_price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</span>
                          <span className="text-xs text-gray-500">Stock: {product.stock_quantity}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Cart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Shopping Cart ({cart.length} items)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      {cart.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Cart is empty</p>
                      ) : (
                        <div className="space-y-2">
                          {cart.map((item: CartItem, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <span className="font-medium">{item.product.name}</span>
                                {item.variant && (
                                  <span className="text-sm text-gray-600 ml-2">({item.variant.variant_name})</span>
                                )}
                                <div className="text-sm text-gray-500">
                                  {(item.variant?.price || item.product.base_price).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })} each
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                    updateCartItemQuantity(index, parseInt(e.target.value) || 0)
                                  }
                                  className="w-16 h-8"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeFromCart(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Checkout Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Checkout
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{(calculateCartTotal() - taxAmount + discountAmount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Label htmlFor="tax">Tax:</Label>
                        <Input
                          id="tax"
                          type="number"
                          min="0"
                          step="0.01"
                          value={taxAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setTaxAmount(parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-8"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Label htmlFor="discount">Discount:</Label>
                        <Input
                          id="discount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={discountAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setDiscountAmount(parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-8"
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-green-600">{calculateCartTotal().toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Method:</Label>
                      <Select value={paymentMethod} onValueChange={(value: 'cash' | 'card' | 'mobile') => setPaymentMethod(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">💵 Cash</SelectItem>
                          <SelectItem value="card">💳 Card</SelectItem>
                          <SelectItem value="mobile">📱 Mobile</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="flex justify-between items-center">
                        <Label htmlFor="payment">Amount:</Label>
                        <Input
                          id="payment"
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setPaymentAmount(parseFloat(e.target.value) || 0)
                          }
                          className="w-24 h-8"
                        />
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleCheckout}
                      disabled={cart.length === 0 || isLoading}
                    >
                      {isLoading ? 'Processing...' : `Complete Sale - ${calculateCartTotal().toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}`}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Product Management</h2>
                <p className="text-gray-600">Manage your inventory and pricing</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Kategori Baru</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCategory} className="space-y-4">
                      <div>
                        <Label htmlFor="category-name">Name</Label>
                        <Input
                          id="category-name"
                          value={categoryForm.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCategoryForm((prev: CreateCategoryInput) => ({ ...prev, name: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="category-description">Description</Label>
                        <Textarea
                          id="category-description"
                          value={categoryForm.description || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setCategoryForm((prev: CreateCategoryInput) => ({ 
                              ...prev, 
                              description: e.target.value || null 
                            }))
                          }
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Creating...' : 'Create Category'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="product-name">Product Name</Label>
                          <Input
                            id="product-name"
                            value={productForm.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductForm((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="product-barcode">Barcode</Label>
                          <Input
                            id="product-barcode"
                            value={productForm.barcode || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductForm((prev: CreateProductInput) => ({ 
                                ...prev, 
                                barcode: e.target.value || null 
                              }))
                            }
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="product-description">Description</Label>
                        <Textarea
                          id="product-description"
                          value={productForm.description || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setProductForm((prev: CreateProductInput) => ({ 
                              ...prev, 
                              description: e.target.value || null 
                            }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="product-price">Base Price</Label>
                          <Input
                            id="product-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={productForm.base_price}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductForm((prev: CreateProductInput) => ({ 
                                ...prev, 
                                base_price: parseFloat(e.target.value) || 0 
                              }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="product-stock">Stock Quantity</Label>
                          <Input
                            id="product-stock"
                            type="number"
                            min="0"
                            value={productForm.stock_quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductForm((prev: CreateProductInput) => ({ 
                                ...prev, 
                                stock_quantity: parseInt(e.target.value) || 0 
                              }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="product-category">Category</Label>
                          <Select 
                            value={productForm.category_id?.toString() || ''} 
                            onValueChange={(value: string) =>
                              setProductForm((prev: CreateProductInput) => ({ 
                                ...prev, 
                                category_id: value ? parseInt(value) : null 
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category: Category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="product-active"
                          checked={productForm.is_active}
                          onCheckedChange={(checked: boolean) =>
                            setProductForm((prev: CreateProductInput) => ({ ...prev, is_active: checked }))
                          }
                        />
                        <Label htmlFor="product-active">Active Product</Label>
                      </div>

                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsProductDialogOpen(false);
                            setEditingProduct(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product: Product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.barcode && (
                              
                              <div className="text-sm text-gray-500">🏷️ {product.barcode}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {categories.find((c: Category) => c.id === product.category_id)?.name || 'Uncategorized'}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {product.base_price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.stock_quantity > 10 ? 'default' : 'destructive'}>
                            {product.stock_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVariantDialog(product.id)}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Transaction History</h2>
              <p className="text-gray-600">View and manage sales transactions</p>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No transactions found. Complete your first sale to see transactions here! 💳
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction: Transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {transaction.transaction_number}
                          </TableCell>
                          <TableCell>
                            {transaction.transaction_date.toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {transaction.final_amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                          </TableCell>
                          <TableCell>
                            <Badge>
                              {transaction.payment_method === 'cash' && '💵'} 
                              {transaction.payment_method === 'card' && '💳'} 
                              {transaction.payment_method === 'mobile' && '📱'} 
                              {transaction.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              transaction.payment_status === 'completed' ? 'default' : 
                              transaction.payment_status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {transaction.payment_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Sales Reports & Analytics</h2>
              <p className="text-gray-600">Track your business performance</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Generate Sales Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select value={reportType} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setReportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">📅 Daily</SelectItem>
                        <SelectItem value="weekly">📊 Weekly</SelectItem>
                        <SelectItem value="monthly">📈 Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={reportStartDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={reportEndDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={generateReport} disabled={isLoading}>
                      {isLoading ? 'Generating...' : 'Generate Report'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {salesReport && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {salesReport.total_transactions}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {salesReport.total_revenue.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Items Sold</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {salesReport.total_items_sold}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Avg Transaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {salesReport.average_transaction_value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {salesReport && salesReport.top_products.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Top Selling Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesReport.top_products.map((product, index) => (
                      <div key={product.product_id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="min-w-8 justify-center">
                            #{index + 1}
                          </Badge>
                          <div>
                            <div className="font-medium">{product.product_name}</div>
                            <div className="text-sm text-gray-500">
                              {product.quantity_sold} sold
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">
                            {product.revenue.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                          </div>
                          <div className="text-sm text-gray-500">revenue</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Price Variant Dialog */}
        <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kelola Varian Harga</DialogTitle>
              <DialogDescription>
                Tambahkan opsi harga berbeda untuk produk ini (misalnya, Kecil, Sedang, Besar)
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreatePriceVariant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="variant-name">Variant Name</Label>
                  <Input
                    id="variant-name"
                    placeholder="e.g., Small, Large, 500g"
                    value={variantForm.variant_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setVariantForm((prev: CreatePriceVariantInput) => ({ 
                        ...prev, 
                        variant_name: e.target.value 
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="variant-price">Price</Label>
                  <Input
                    id="variant-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={variantForm.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setVariantForm((prev: CreatePriceVariantInput) => ({ 
                        ...prev, 
                        price: parseFloat(e.target.value) || 0 
                      }))
                    }
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="variant-default"
                  checked={variantForm.is_default}
                  onCheckedChange={(checked: boolean) =>
                    setVariantForm((prev: CreatePriceVariantInput) => ({ ...prev, is_default: checked }))
                  }
                />
                <Label htmlFor="variant-default">Set as default variant</Label>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Variant'}
                </Button>
              </DialogFooter>
            </form>

            {selectedProductForVariant && priceVariants[selectedProductForVariant] && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Existing Variants:</h4>
                <div className="space-y-2">
                  {priceVariants[selectedProductForVariant].map((variant: PriceVariant) => (
                    <div key={variant.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{variant.variant_name}</span>
                        {variant.is_default && (
                          <Badge variant="secondary" className="ml-2">Default</Badge>
                        )}
                      </div>
                      <span className="font-bold text-green-600">
                        {variant.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Price Selection Dialog (for POS) */}
        <Dialog open={isVariantSelectionDialogOpen} onOpenChange={setIsVariantSelectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pilih Varian Produk</DialogTitle>
              <DialogDescription>
                Pilih harga atau varian untuk {selectedProductForVariantSelection?.name}.
              </DialogDescription>
            </DialogHeader>

            {selectedProductForVariantSelection && (
              <div className="space-y-4 pt-4">
                {/* Base Price Option */}
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">Harga Dasar</span>
                    <div className="text-sm text-gray-500">Stok: {selectedProductForVariantSelection.stock_quantity}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      addToCart(selectedProductForVariantSelection); // No variant selected, use base price
                      setIsVariantSelectionDialogOpen(false);
                    }}
                  >
                    Tambah - {selectedProductForVariantSelection.base_price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                  </Button>
                </div>

                {/* Price Variants */}
                {priceVariants[selectedProductForVariantSelection.id]?.length > 0 && (
                  <>
                    <h4 className="font-medium mb-2">Varian Lain:</h4>
                    <div className="space-y-2">
                      {priceVariants[selectedProductForVariantSelection.id].map((variant: PriceVariant) => (
                        <div key={variant.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium">{variant.variant_name}</span>
                            {variant.is_default && (
                              <Badge variant="secondary" className="ml-2">Default</Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              addToCart(selectedProductForVariantSelection, variant);
                              setIsVariantSelectionDialogOpen(false);
                            }}
                          >
                            Tambah - {variant.price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsVariantSelectionDialogOpen(false)}
                  >
                    Batal
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;
