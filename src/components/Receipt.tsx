import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { SaleItem } from '../db';
import { useLanguage } from '@/i18n/LanguageContext';

interface ReceiptProps {
  items: SaleItem[];
  subtotal?: number;
  discount?: number;
  serviceCharge?: number;
  total: number;
  date: Date;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ items, subtotal, discount, serviceCharge, total, date }, ref) => {
    const { t } = useLanguage();
    
    return (
      <div ref={ref} className="receipt-print p-2 font-mono text-xs text-black bg-white w-[58mm] mx-auto border shadow-sm">
        <div className="text-center mb-4">
          <h1 className="font-bold text-base uppercase">{t('receiptTitle')}</h1>
          <p>{t('receiptAddress')}</p>
          <p>01745543717, 01757290773</p>
        </div>
          
          <div className="mb-2 border-b border-dashed border-black pb-2">
            <p>{t('receiptDate')}: {format(date, 'dd/MM/yyyy HH:mm')}</p>
          </div>

          <table className="w-full mb-2">
            <thead>
              <tr className="border-b border-dashed border-black">
                <th className="text-left font-normal py-1">{t('receiptItem')}</th>
                <th className="text-right font-normal py-1">{t('receiptQty')}</th>
                <th className="text-right font-normal py-1">{t('receiptAmt')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="py-1 break-words max-w-[30mm]">{item.name}</td>
                  <td className="text-right py-1 align-top">{item.quantity}</td>
                  <td className="text-right py-1 align-top">{(item.sellPrice * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-black pt-2 mb-4">
            {discount && discount > 0 ? (
              <>
                <div className="flex justify-between mb-1">
                  <span>{t('receiptSubtotal')}:</span>
                  <span>Tk {subtotal?.toFixed(2) || (total + discount - (serviceCharge || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>{t('receiptDiscount')}:</span>
                  <span>-Tk {discount.toFixed(2)}</span>
                </div>
              </>
            ) : null}
            {serviceCharge && serviceCharge > 0 ? (
              <div className="flex justify-between mb-1">
                <span>Service Charge:</span>
                <span>+Tk {serviceCharge.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>{t('receiptTotal')}:</span>
              <span>Tk {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center mt-4 pt-2 border-t border-dashed border-black">
            <p>{t('receiptThanks')}</p>
            <p>{t('receiptVisit')}</p>
          </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';
