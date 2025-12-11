import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function RatingDialog({ workOrder, open, onClose, onSubmit }) {
  const [rating, setRating] = useState(workOrder?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(workOrder?.rating_comment || '');

  const handleSubmit = () => {
    onSubmit(workOrder.id, { rating, rating_comment: comment });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Work Order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-2">{workOrder?.title}</h4>
            <p className="text-sm text-slate-600">{workOrder?.description}</p>
          </div>

          <div>
            <Label className="mb-2 block">Rating *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8",
                      (hoveredRating || rating) >= value
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-slate-300"
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-slate-700">
                  {rating} / 5
                </span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="rating_comment">Comments (Optional)</Label>
            <Textarea
              id="rating_comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Share your feedback about the work completed..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}