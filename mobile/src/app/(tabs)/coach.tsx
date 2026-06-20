import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Bot, ArrowLeft, Send, Sparkles } from "lucide-react-native";

import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useOfflineProfile } from "@/hooks/useOfflineProfile";
import { useNetwork } from "@/context/NetworkContext";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineEmptyState } from "@/components/OfflineEmptyState";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  disclaimer?: string;
  isMoodPrompt?: boolean;
}

const MOODS = [
  { key: "great", label: "Great", emoji: "✨", bg: "#ECFDF5", border: "#D1FAE5", text: "#065F46" },
  { key: "okay", label: "Okay", emoji: "😊", bg: "#EFF6FF", border: "#DBEAFE", text: "#1E40AF" },
  { key: "tired", label: "Tired", emoji: "😴", bg: "#FFFBEB", border: "#FEF3C7", text: "#92400E" },
  { key: "stressed", label: "Stressed", emoji: "🤯", bg: "#FEF2F2", border: "#FEE2E2", text: "#991B1B" },
];

export default function CoachScreen() {
  const { user } = useAuth();
  const { profile } = useOfflineProfile();
  const { isOnline } = useNetwork();
  const scrollViewRef = useRef<ScrollView>(null);

  // Extract first name
  const firstName = useMemo(() => {
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      return parts[parts.length - 1];
    }
    return user?.display_name || "Thunee";
  }, [profile?.fullName, user?.display_name]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: `Hi ${firstName}! 👋 How are you feeling today?`,
      isMoodPrompt: true,
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [moodSelected, setMoodSelected] = useState(false);
  const [selectedMoodKey, setSelectedMoodKey] = useState<string | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);

  useEffect(() => {
    if (!moodSelected) {
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          text: `Hi ${firstName}! 👋 How are you feeling today?`,
          isMoodPrompt: true,
        },
      ]);
    }
  }, [firstName, moodSelected]);

  const handleMoodSelect = async (moodKey: string, moodLabel: string, moodEmoji: string) => {
    if (moodSelected) return;

    setMoodSelected(true);
    setSelectedMoodKey(moodKey);

    const userMsgId = `user-mood-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: `I'm feeling ${moodLabel.toLowerCase()}! ${moodEmoji}`,
    };

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === "welcome" ? { ...msg, isMoodPrompt: false } : msg
      ).concat(userMsg)
    );

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    setIsBotThinking(true);

    try {
      let botResponseText = "";
      let disclaimerText = "";

      if (isOnline) {
        const res = await api.post<{ advice: string; disclaimer?: string }>("/ai/advice", {
          prompt: `I am feeling ${moodLabel}.`,
        });
        botResponseText = res.advice;
        disclaimerText = res.disclaimer || "";
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        botResponseText = `Chào bạn! Cảm ơn bạn đã chia sẻ rằng bạn đang cảm thấy ${moodLabel.toLowerCase()} ${moodEmoji}. Hiện tại thiết bị đang ngoại tuyến. AI Coach cần kết nối mạng để phân tích dữ liệu dinh dưỡng hôm nay và đưa ra lời khuyên cá nhân hóa chính xác nhất. Hãy kết nối lại mạng để trò chuyện tiếp nhé!`;
      }

      const botMsg: Message = {
        id: `bot-mood-resp-${Date.now()}`,
        sender: "bot",
        text: botResponseText,
        disclaimer: disclaimerText || undefined,
      };

      setMessages((prev) => prev.concat(botMsg));
    } catch (err: any) {
      console.log("Error getting AI advice:", err);
      const errorMsg: Message = {
        id: `bot-error-${Date.now()}`,
        sender: "bot",
        text: "Xin lỗi bạn, hệ thống AI đang gặp lỗi kết nối. Vui lòng kiểm tra lại đường truyền và thử lại nhé! 😢",
      };
      setMessages((prev) => prev.concat(errorMsg));
    } finally {
      setIsBotThinking(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSendMessage = async () => {
    if (!inputVal.trim() || !moodSelected || isBotThinking) return;

    const userText = inputVal.trim();
    setInputVal("");

    const userMsg: Message = {
      id: `user-msg-${Date.now()}`,
      sender: "user",
      text: userText,
    };

    setMessages((prev) => prev.concat(userMsg));
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    setIsBotThinking(true);

    try {
      let botResponseText = "";
      let disclaimerText = "";

      if (isOnline) {
        const res = await api.post<{ advice: string; disclaimer?: string }>("/ai/advice", {
          prompt: userText,
        });
        botResponseText = res.advice;
        disclaimerText = res.disclaimer || "";
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        botResponseText = "AI Coach cần kết nối mạng để phân tích dữ liệu dinh dưỡng và đưa ra câu trả lời cá nhân hóa. Hãy kết nối internet và thử lại nhé! 📶";
      }

      const botMsg: Message = {
        id: `bot-msg-resp-${Date.now()}`,
        sender: "bot",
        text: botResponseText,
        disclaimer: disclaimerText || undefined,
      };

      setMessages((prev) => prev.concat(botMsg));
    } catch (err: any) {
      console.log("Error getting AI advice:", err);
      const errorMsg: Message = {
        id: `bot-error-${Date.now()}`,
        sender: "bot",
        text: "AI Coach đang bận xử lý hoặc gặp lỗi kết nối. Hãy thử gửi lại sau nhé! 🛠️",
      };
      setMessages((prev) => prev.concat(errorMsg));
    } finally {
      setIsBotThinking(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <OfflineBanner pushContent />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ArrowLeft size={22} color="#0F172A" />
        </Pressable>
        
        <View style={styles.headerProfile}>
          <View style={styles.robotBadge}>
            <Bot size={22} color="#10B981" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>AI Coach</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>
      </View>

      {!isOnline ? (
        <OfflineEmptyState />
      ) : (
        <>
          {/* Chat Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatList}
        contentContainerStyle={styles.chatListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          if (msg.sender === "user") {
            return (
              <View key={msg.id} style={styles.userMessageContainer}>
                <View style={[styles.messageBubble, styles.userBubble]}>
                  <Text style={styles.userText}>{msg.text}</Text>
                </View>
              </View>
            );
          }

          return (
            <View key={msg.id} style={styles.botMessageContainerWrapper}>
              <View style={styles.botMessageContainer}>
                <View style={styles.botAvatarWrap}>
                  <Bot size={16} color="#10B981" />
                </View>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <Text style={styles.botText}>{msg.text}</Text>
                  {msg.disclaimer ? (
                    <Text style={styles.disclaimerText}>* {msg.disclaimer}</Text>
                  ) : null}
                </View>
              </View>

              {/* Render mood grid if it's the welcome message and isMoodPrompt is true */}
              {msg.isMoodPrompt && (
                <View style={styles.moodPromptContainer}>
                  <Text style={styles.moodPromptTitle}>Select your current mood</Text>
                  <View style={styles.moodGrid}>
                    {MOODS.map((mood) => {
                      const active = selectedMoodKey === mood.key;
                      return (
                        <Pressable
                          key={mood.key}
                          style={[
                            styles.moodCard,
                            {
                              backgroundColor: mood.bg,
                              borderColor: mood.border,
                            },
                            active && styles.activeMoodCard,
                          ]}
                          onPress={() => handleMoodSelect(mood.key, mood.label, mood.emoji)}
                          disabled={moodSelected}
                        >
                          <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                          <Text style={[styles.moodLabel, { color: mood.text }]}>
                            {mood.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {isBotThinking && <TypingIndicator />}
      </ScrollView>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={styles.inputContainer}
      >
        <View style={styles.inputInner}>
          <View style={[styles.textInputWrap, !moodSelected && styles.disabledInputWrap]}>
            <TextInput
              style={styles.textInput}
              placeholder={moodSelected ? "Ask AI Coach..." : "Select a mood first..."}
              placeholderTextColor="#94A3B8"
              value={inputVal}
              onChangeText={setInputVal}
              editable={moodSelected && !isBotThinking}
              onSubmitEditing={handleSendMessage}
            />
          </View>

          <Pressable
            style={[
              styles.sendButton,
              (!moodSelected || !inputVal.trim() || isBotThinking) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!moodSelected || !inputVal.trim() || isBotThinking}
          >
            <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 200);
    const anim3 = animateDot(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.botMessageContainer}>
      <View style={styles.botAvatarWrap}>
        <Bot size={16} color="#10B981" />
      </View>
      <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
        <Animated.View style={[styles.typingDot, { opacity: dot1, transform: [{ translateY: dot1.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }] } />
        <Animated.View style={[styles.typingDot, { opacity: dot2, transform: [{ translateY: dot2.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }] } />
        <Animated.View style={[styles.typingDot, { opacity: dot3, transform: [{ translateY: dot3.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }] } />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4FAF8",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#ECF0EE",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  robotBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E6F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "700",
  },

  // Chat Area
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  // Messages
  botMessageContainerWrapper: {
    marginBottom: 20,
  },
  botMessageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  botAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E6F7F0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  messageBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
  },
  botBubble: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
    maxWidth: "85%",
  },
  userBubble: {
    backgroundColor: "#10CDBA",
    borderTopRightRadius: 4,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  botText: {
    fontSize: 15,
    color: "#0F172A",
    lineHeight: 22,
    fontWeight: "600",
  },
  userText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 22,
    fontWeight: "700",
  },
  disclaimerText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 10,
    fontStyle: "italic",
    lineHeight: 16,
  },

  // Mood selector
  moodPromptContainer: {
    marginTop: 20,
    paddingLeft: 40, // align with the welcome message bubble
  },
  moodPromptTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 12,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  moodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activeMoodCard: {
    borderWidth: 2,
    transform: [{ scale: 0.98 }],
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: "800",
  },

  // Typing loader
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 38,
    width: 60,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },

  // Input Bar
  inputContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#EBF0EE",
    marginBottom: Platform.OS === "ios" ? 98 : 94, // sit exactly on top of the custom tab bar
  },
  inputInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textInputWrap: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  disabledInputWrap: {
    backgroundColor: "#F8FAFC",
    opacity: 0.85,
  },
  textInput: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#10CDBA",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
});