"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Navbar from "./Navbar";

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!error && data.user) {
        setUser(data.user);
        setName(data.user.user_metadata?.full_name || "");
        setEmail(data.user.email || "");
      }

      setLoading(false);
    };

    getUser();
  }, []);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      // Update user metadata (name)
      const updates: any = {
        data: {
          full_name: name,
        },
      };

      // If password fields are filled, add password update
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setMessage("Passwords do not match");
          return;
        }
        updates.password = newPassword;
      }

      const { error } = await supabase.auth.updateUser(updates);

      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage("Changes saved successfully");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error) {
      setMessage("An error occurred");
    }
  };

  const handleReset = () => {
    setName(user?.user_metadata?.full_name || "");
    setEmail(user?.email || "");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
  };

  if (loading) {
    return <p>Loading settings...</p>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Update your personal information below</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSaveChanges} className="px-8 py-6 space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Change Password Section */}
          <div className="pt-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase mb-4">Change Password</h3>
            
            {/* New Password */}
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-xs font-medium text-gray-500 uppercase mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full px-4 py-3 border border-gray-300 rounded bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-500 uppercase mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 border border-gray-300 rounded bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded ${
                message.includes("Error") || message === "Passwords do not match"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded border border-gray-300 transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
