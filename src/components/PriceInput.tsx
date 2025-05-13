
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface PriceInputProps {
  defaultPrice?: number;
  onChange: (price: number) => void;
}

const PriceInput = ({ defaultPrice = 2.00, onChange }: PriceInputProps) => {
  const [price, setPrice] = useState(defaultPrice);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setPrice(value);
      onChange(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="price-per-page">Price per Page (₱)</Label>
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
          ₱
        </span>
        <Input
          id="price-per-page"
          type="number"
          min="0.01"
          step="0.01"
          className="pl-7"
          value={price}
          onChange={handlePriceChange}
        />
      </div>
    </div>
  );
};

export default PriceInput;
