import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";

interface LoginButtonProps {
  onSuccess: (user: { name: string; picture: string }) => void;
}

export function LoginButton({ onSuccess }: LoginButtonProps) {
  const handleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const decodedDetails: any = jwtDecode(credentialResponse.credential);
      console.log("تم تسجيل الدخول بنجاح:", decodedDetails);
      
      // حفظ البيانات محلياً كما طلبنا في هندسة المشروع
      localStorage.setItem("userName", decodedDetails.name);
      localStorage.setItem("userPicture", decodedDetails.picture);
      
      alert(`مرحباً بك يا ${decodedDetails.name}`);
      
      onSuccess({
        name: decodedDetails.name,
        picture: decodedDetails.picture
      });
    }
  };

  const handleError = () => {
    console.error("فشل تسجيل الدخول");
    alert("حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى.");
  };

  return (
    <div className="flex justify-center p-4">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        // تم إيقاف useOneTap لتجنب خطأ FedCM NotAllowedError في إطارات (iframes)
      />
    </div>
  );
}
