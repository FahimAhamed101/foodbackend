import { Schema, model, Document, Types } from 'mongoose';

export interface ICartItem {
    foodId: Types.ObjectId;
    quantity: number;
    price: number;
}

export interface ICart extends Document {
    userId: Types.ObjectId;
    items: ICartItem[];
    subtotal: number;
    createdAt: Date;
    updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
    {
        foodId: {
            type: Schema.Types.ObjectId,
            ref: 'Food',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1'],
            default: 1,
        },
        price: {
            type: Number,
            required: true,
            min: [0, 'Price cannot be negative'],
        },
    },
    { _id: false }
);

const cartSchema = new Schema<ICart>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        items: [cartItemSchema],
        subtotal: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Calculate subtotal before saving
cartSchema.pre('save', async function () {
    this.subtotal = this.items.reduce((total, item) => {
        return total + item.price * item.quantity;
    }, 0);
});

export const Cart = model<ICart>('Cart', cartSchema);
