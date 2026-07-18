"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Job } from "@/lib/database/calendar";

interface JobEntryFormProps {
  onSubmit: (data: Omit<Job, "id" | "shop_id" | "created_at" | "updated_at">) => void;
  onClose: () => void;
}

export function JobEntryForm({ onSubmit, onClose }: JobEntryFormProps) {
  const [formData, setFormData] = useState({
    workorder_id: "",
    time_in: new Date().toISOString(),
    eta_out: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    customer_id: "",
    hook_in: "",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "",
    duration: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      workorder_id: "",
      time_in: new Date().toISOString(),
      eta_out: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      customer_id: "",
      hook_in: "",
      workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
      sale_id: "0",
      sale_line_id: "",
      duration: 1,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Add New Job
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="workorder_id">Work Order ID</Label>
              <Input
                id="workorder_id"
                value={formData.workorder_id}
                onChange={(e) => setFormData({ ...formData, workorder_id: e.target.value })}
                placeholder="e.g., WO-001"
                required
              />
            </div>

            <div>
              <Label htmlFor="hook_in">Job Description</Label>
              <Input
                id="hook_in"
                value={formData.hook_in}
                onChange={(e) => setFormData({ ...formData, hook_in: e.target.value })}
                placeholder="e.g., Oil Change, Brake Repair"
                required
              />
            </div>

            <div>
              <Label htmlFor="customer_id">Customer ID</Label>
              <Input
                id="customer_id"
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData({ ...formData, customer_id: e.target.value })
                }
                placeholder="Customer ID"
                required
              />
            </div>

            <div>
              <Label htmlFor="sale_line_id">Sale Line ID</Label>
              <Input
                id="sale_line_id"
                value={formData.sale_line_id}
                onChange={(e) =>
                  setFormData({ ...formData, sale_line_id: e.target.value })
                }
                placeholder="Sale Line ID"
                required
              />
            </div>

            <div>
              <Label htmlFor="time_in">Time In</Label>
              <Input
                id="time_in"
                type="datetime-local"
                value={formData.time_in.slice(0, 16)}
                onChange={(e) =>
                  setFormData({ ...formData, time_in: new Date(e.target.value).toISOString() })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="eta_out">ETA Out</Label>
              <Input
                id="eta_out"
                type="datetime-local"
                value={formData.eta_out.slice(0, 16)}
                onChange={(e) =>
                  setFormData({ ...formData, eta_out: new Date(e.target.value).toISOString() })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="8"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })
                }
                required
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Add Work Order
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
