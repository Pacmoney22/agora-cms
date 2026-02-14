'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { productsApi } from '@/lib/api-client';
import { ProductForm } from '@/components/ProductForm';

export default function NewProductPage() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: any) => productsApi.create(data),
    onSuccess: (result) => {
      toast.success('Product created');
      router.push(`/products/${result.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
        <p className="mt-1 text-sm text-gray-500">Create a new product in your catalog.</p>
      </div>
      <ProductForm
        onSubmit={(data) => mutation.mutate(data)}
        isPending={mutation.isPending}
        submitLabel="Create Product"
      />
    </div>
  );
}
