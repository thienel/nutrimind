// =======================================================
// Kiểm tra user đã setup profile đầy đủ hay chưa
//
// Mục đích:
// - Dùng để chặn các chức năng yêu cầu profile hoàn chỉnh
// - Nếu thiếu dữ liệu quan trọng thì ép user vào màn setup/update
//
// Logic:
// Dùng !! để ép kết quả về true/false
//
// Chỉ cần thiếu 1 cái -> false
// =======================================================
export const isProfileCompleted = (profile: any) => {
  return !!(
    profile?.age &&
    profile?.gender &&
    profile?.height_cm &&
    profile?.weight_kg &&
    profile?.goal &&
    profile?.activity_level
  );
};
