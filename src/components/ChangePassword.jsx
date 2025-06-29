import React, { useState, useRef, useEffect } from 'react';

export default function EditPassword() {
  const [currentStep, setCurrentStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [countdown, setCountdown] = useState(59);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [temporaryToken, setTemporaryToken] = useState(''); 

  const otpInputRefs = useRef([]);

  const API_BASE_URL = 'https://api.peshekar.online/api/v1';

  useEffect(() => {
    let timer;
    if (isCountingDown && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsCountingDown(false);
      setErrorMessage("OTP kodu vaxtı bitdi. Zəhmət olmasa yenidən cəhd edin.");
    }
    return () => clearInterval(timer);
  }, [isCountingDown, countdown]);

  const navigateTo = (path) => {
    console.log(`Navigating to: ${path}`);
  };

  const handleNext = async () => {
    setErrorMessage('');
  
    // STEP 1: OTP tələb et
    if (currentStep === 1) {
      if (!mobileNumber.match(/^\d{9}$/)) {
        setErrorMessage("Mobil nömrə düzgün daxil edilməyib. Nümunə: 501234567.");
        return;
      }
  
      try {
        const response = await fetch(`${API_BASE_URL}/password/reset/request/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile_number: mobileNumber.trim() }),
        });
  
        const data = await response.json();
        console.log("OTP Request Response:", data);
  
        if (response.ok) {
          setCurrentStep(2);
          setCountdown(59);
          setIsCountingDown(true);
        } else {
          setErrorMessage(data.detail || "Bu telefon nömrəsi ilə istifadəçi tapılmadı");
        }
      } catch (error) {
        setErrorMessage("Şəbəkə xətası. İnternet bağlantınızı yoxlayın.");
        console.error("Server error during OTP request:", error);
      }
    }
  
    // STEP 2: OTP təsdiqlə və tokeni al
    else if (currentStep === 2) {
      const enteredOtp = otpCode.join('');
  
      if (enteredOtp.length !== 6 || !/^\d+$/.test(enteredOtp)) {
        setErrorMessage("Zəhmət olmasa 6 rəqəmli OTP kodunu düzgün daxil edin.");
        return;
      }
  
      try {
        const response = await fetch(`${API_BASE_URL}/password/otp/verify/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile_number: mobileNumber.trim(), otp_code: enteredOtp }),
        });
  
        const data = await response.json();
        console.log("OTP Verify Response:", data);
  
        if (response.ok && data.token) {
          localStorage.setItem("reset_token", data.token);
          setTemporaryToken(data.token);
          setCurrentStep(3);
          setIsCountingDown(false);
        } else {
          setErrorMessage(data.detail || "Yanlış və ya vaxtı keçmiş OTP kodu");
        }
      } catch (error) {
        setErrorMessage("Şəbəkə xətası. İnternet bağlantınızı yoxlayın.");
        console.error("Server error during OTP verification:", error);
      }
    }
  
   // STEP 3: Yeni şifrəni təsdiqlə
else if (currentStep === 3) {
  setErrorMessage('');

  const token = temporaryToken || localStorage.getItem("reset_token");
  console.log("Token to be used:", token);

  if (!token) {
    setErrorMessage("Token tapılmadı. OTP mərhələsini yenidən keçin.");
    setCurrentStep(1);
    localStorage.removeItem("reset_token");
    return;
  }

  if (!newPassword || !confirmNewPassword) {
    setErrorMessage("Zəhmət olmasa şifrə sahələrini doldurun.");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    setErrorMessage("Yeni şifrələr eyni olmalıdır.");
    return;
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{7,15}$/;

  if (!passwordRegex.test(newPassword)) {
    setErrorMessage("Şifrə 7-15 simvol uzunluğunda olmalı, ən az bir böyük hərf, bir kiçik hərf, bir rəqəm və bir işarə (!@#$%^&*()_+) ehtiva etməlidir.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/password/reset/confirm/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
      body: JSON.stringify({
        new_password: newPassword,
        new_password_two: confirmNewPassword,
      }),
    });

    console.log("Raw Response Status:", response.status, response.statusText);
    const result = await response.json();
    console.log("Password Reset Confirm Response:", result);

    if (response.ok) {
      setShowSuccessPopup(true); // ✅ Burada popup aktiv edilir
      localStorage.removeItem("reset_token");
      setErrorMessage('');
    } else {
      const errorMsg =
        result.detail ||
        result.message ||
        (result.messages && result.messages[0]?.message) ||
        "Şifrə dəyişdirilmə zamanı naməlum xəta baş verdi.";
      setErrorMessage(errorMsg);
      console.error("API returned an error:", result);
    }
  } catch (error) {
    setErrorMessage("Şəbəkə xətası: İnternet bağlantınızı yoxlayın və ya serverə çatıla bilmir.");
    console.error("Network error during password reset confirm:", error);
  }
}




  };
  
  

  const handleBack = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setIsCountingDown(false);
      if (currentStep === 2) {
        setOtpCode(Array(6).fill(''));
        setTemporaryToken(''); // Clear token if going back from OTP verification
        localStorage.removeItem("reset_token");
      }
    } else if (currentStep === 1) {
      navigateTo('/login');
    }
  };

  const handleMobileNumberChange = (e) => {
    setMobileNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 9));
    setErrorMessage('');
  };

  const handleOtpChange = (e, index) => {
    const value = e.target.value;
    setErrorMessage('');

    if (/^\d*$/.test(value) && value.length <= 1) {
      const newOtpCode = [...otpCode];
      newOtpCode[index] = value;
      setOtpCode(newOtpCode);

      if (value && index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    setCountdown(59);
    setIsCountingDown(true);
    setErrorMessage('');
  
    if (!mobileNumber.match(/^\d{9}$/)) {
      setErrorMessage("Mobil nömrə düzgün daxil edilməyib. Nümunə: 501234567.");
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/password/reset/request/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mobile_number: mobileNumber.trim() 
        })
      });
  
      const data = await response.json();
      console.log("Resend OTP Response:", data);
  
      if (response.ok) {
        alert("Yeni OTP kodu göndərildi!");
        setErrorMessage('');
      } else {
        const serverErrorMessage = data.detail ||
                                   (data.mobile_number && data.mobile_number[0]) ||
                                   JSON.stringify(data);
        setErrorMessage(`OTP yenidən göndərilərkən xəta baş verdi: ${serverErrorMessage}`);
      }
    } catch (error) {
      setErrorMessage("Şəbəkə xətası. İnternet bağlantınızı yoxlayın.");
      console.error("Server error during OTP resend:", error);
    }
  };
  

  const handleNewPasswordChange = (e) => {
    setNewPassword(e.target.value);
    setErrorMessage('');
  };

  const handleConfirmNewPasswordChange = (e) => {
    setConfirmNewPassword(e.target.value);
    setErrorMessage('');
  };

  const handleSuccessOk = () => {
    setShowSuccessPopup(false);
    navigateTo('/login');
    setCurrentStep(1);
    setMobileNumber('');
    setOtpCode(Array(6).fill(''));
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMessage('');
    setTemporaryToken('');
    localStorage.removeItem("reset_token");
  };

  const handleRegisterClick = () => {
    navigateTo('/registration/personal-info');
  };

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const toggleConfirmNewPasswordVisibility = () => {
    setShowConfirmNewPassword(!showConfirmNewPassword);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-white/70 backdrop-blur-sm rounded-lg shadow-lg bg-cover bg-center"
         style={{ backgroundImage: "url('/bg.png')" }}>

      <div className="absolute inset-0 bg-black opacity-30"></div>

      <div className="relative bg-white/82 backdrop-blur-xs border border-white/30 p-8 rounded-lg shadow-xl w-[28rem] z-10">
        <h3 className="text-2xl font-semibold text-[#1A4862] mb-5 text-start">Şifrənizi bərpa edin</h3>

        {/* Display error message if any */}
        {errorMessage && (
          <p className="text-red-500 text-center mb-4">{errorMessage}</p>
        )}

        {/* Step 1: Mobile Number Input */}
        {currentStep === 1 && (
          <>
            <div className="mb-6">
              <label htmlFor="mobileNumber" className="flex items-center gap-2 text-[#656F83] text-[.9rem] mb-2">
                Mobil nömrə <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="flex border border-[#C3C8D1] rounded-lg overflow-hidden h-[3.2rem]">
                <span className="bg-gray-100 p-3 flex items-center text-[#1A4862] font-semibold">+994</span>
                <input
                  type="tel"
                  id="mobileNumber"
                  placeholder="50 123 45 67"
                  value={mobileNumber}
                  onChange={handleMobileNumberChange}
                  className="flex-grow outline-none p-3 text-[#1A4862] placeholder-[#656F83]"
                  maxLength="9"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-center">
            <button
                onClick={handleBack}
                className="cursor-pointer flex-1 h-[2.7rem] bg-white border border-[#C3C8D1] text-[#1A4862] text-[15px] font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                    <path d="M15 18L9 12L15 6" stroke="#1A4862" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Geri
              </button>
              <button
                onClick={handleNext}
                className="cursor-pointer w-[65%] h-[2.7rem] bg-[#1A4862] text-white text-[15px] font-semibold rounded-lg hover:bg-blue-900 transition-colors flex items-center justify-center gap-2"
              >
                SMS göndər
                <img src="/sms.svg" alt="sms" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: OTP Input */}
        {currentStep === 2 && (
          <>
            <p className="text-[#656F83] text-center mb-6">
              OTP kodu daxil edin.
              <br />
              +994 {mobileNumber ? mobileNumber : 'XX XXX XX XX'} nömrəsinə göndərildi.
            </p>
            <div className="flex justify-center gap-2 mb-4">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(e, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  className="w-10 h-10 border bg-[#F3F4F6] border-[#F3F4F6] rounded-lg text-center text-xl font-bold outline-none focus:border-[#3187B8] text-[#1A4862]"
                />
              ))}
            </div>
            <p className="text-center text-[#656F83] text-sm mb-6">
              <a href="#"
                 onClick={(e) => { e.preventDefault(); handleResendOtp(); }}
                 className={`font-semibold ${isCountingDown ? 'text-gray-400 cursor-not-allowed' : 'text-[#3187B8] hover:underline'}`}
                 style={{pointerEvents: isCountingDown ? 'none' : 'auto'}}
              >
                <span className='text-[#3187B8] pr-1'>Yenidən göndər</span>
              </a> {isCountingDown && `00:${countdown < 10 ? `0${countdown}` : countdown}`}
            </p>
             <div className="flex gap-2 justify-center">
            <button
                onClick={handleBack}
                className="cursor-pointer flex-1 h-[2.7rem] bg-white border border-[#C3C8D1] text-[#1A4862] text-[15px] font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                    <path d="M15 18L9 12L15 6" stroke="#1A4862" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Geri
              </button>
              <button
                onClick={handleNext}
                className="cursor-pointer w-[65%] h-[2.7rem] bg-[#1A4862] text-white text-[15px] font-semibold rounded-lg hover:bg-blue-900 transition-colors flex items-center justify-center gap-2"
              >
                 Təsdiqlə
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                  <path d="M9 6L15 12L9 18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
              </button>
            </div>
          </>
        )}

        {/* Step 3: New Password Input */}
        {currentStep === 3 && (
          <>
            <div className="mb-4">
              <label htmlFor="newPassword" className="flex items-center gap-2 text-[#656F83] text-[.9rem] mb-2">
                Yeni şifrə <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="relative">
              <input
  type={showNewPassword ? "text" : "password"}
  id="newPassword"
  placeholder="Şifrənizi daxil edin"
  value={newPassword}
  onChange={handleNewPasswordChange}
  className="w-full h-[3.2rem] border border-[#C3C8D1] rounded-lg outline-none p-3 pr-10 text-[#1A4862] placeholder-[#656F83]"
/>
<img
  src={showNewPassword ? "/eye.svg" : "/invisible.svg"}
  alt="toggle password visibility"
  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 cursor-pointer"
  onClick={toggleNewPasswordVisibility}
/>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="confirmNewPassword" className="flex items-center gap-2 text-[#656F83] text-[.9rem] mb-2">
                Şifrəni təkrar yazın <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="relative">
              <input
  type={showConfirmNewPassword ? "text" : "password"}
  id="confirmNewPassword"
  placeholder="Şifrənizi təkrar daxil edin"
  value={confirmNewPassword}
  onChange={handleConfirmNewPasswordChange}
  className="w-full h-[3.2rem] border border-[#C3C8D1] rounded-lg outline-none p-3 pr-10 text-[#1A4862] placeholder-[#656F83]"
/>
<img
  src={showConfirmNewPassword ? "/eye.svg" : "/invisible.svg"}
  alt="toggle password visibility"
  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 cursor-pointer"
  onClick={toggleConfirmNewPasswordVisibility}
/>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
            <button
                onClick={handleBack}
                className="cursor-pointer flex-1 h-[2.7rem] bg-white border border-[#C3C8D1] text-[#1A4862] text-[15px] font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                    <path d="M15 18L9 12L15 6" stroke="#1A4862" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Geri
              </button>
              <button
                onClick={handleNext}
                className="cursor-pointer w-[65%] h-[2.7rem] bg-[#1A4862] text-white text-[15px] font-semibold rounded-lg hover:bg-blue-900 transition-colors flex items-center justify-center gap-2"
              >
               Şifrəni yenilə <img src="/check.svg" alt="check icon" className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        <p className="text-center text-[#656F83] text-sm mt-5">
          Hesabınız yoxdur? <a href="#" className="text-[#3187B8] font-semibold hover:underline" onClick={handleRegisterClick}>Qeydiyyatdan keçin</a>
        </p>
      </div>

      {/* Success Pop-up/Modal */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-[24rem] text-center">
            <div className="flex justify-center mb-6">
              <img src="/Succes.svg" alt="success-icon" className="w-16 h-16" />
            </div>
            <h3 className="text-2xl font-bold text-[#1A4862] mb-3">Şifrəniz uğurla bərpa edildi!</h3>
            <button
              onClick={handleSuccessOk}
              className="cursor-pointer px-8 py-3 bg-[#1A4862] text-white text-lg font-semibold rounded-lg hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <img src="/user.svg" alt="login icon" className="w-5 h-5" /> Daxil ol
            </button>
          </div>
        </div>
      )}
    </div>
  );
}