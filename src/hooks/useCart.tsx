import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartProductExists = cart.find(product => product.id === productId);

      const currentAmount = cartProductExists ? cartProductExists.amount : 0;
      const newAmount = currentAmount + 1;

      const { data: stockData } = await api.get(`/stock/${productId}`);

      if (newAmount > stockData.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let newCart: Product[] = [];

      if (cartProductExists) {
        newCart = cart.map(product => product.id !== productId ? product : {
          ...product,
          amount: newAmount
        })

        setCart(newCart);
      } else {
        const { data: productData } = await api.get(`/products/${productId}`);

        const normalizeProduct: Product = {
          ...productData,
          amount: newAmount
        }

        newCart = [...cart, normalizeProduct];

        setCart(newCart);
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const updatedCart = [...cart];

      const productIndex = updatedCart.findIndex(product => productId === product.id);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);

        setCart(updatedCart);
      } else {
        throw Error();
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }

      const { data: stockData } = await api.get(`/stock/${productId}`);

      if (stockData <= 0) {
        return;
      }
      if (amount > stockData.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const findItem = cart.findIndex(product => product.id === productId);

      cart[findItem].amount = amount;

      setCart([...cart]);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
