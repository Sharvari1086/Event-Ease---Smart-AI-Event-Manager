// src/AIScreen.js

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import {
  sendMessage,
  buildUserContext,
  saveMessage,
  loadHistory,
  clearHistory,
} from './aiService';

import { useAuth } from './AuthContext';
import { COLORS, SPACING, RADIUS } from './colors';

// ─────────────────────────────────────────────
// Suggestions
// ─────────────────────────────────────────────

const SUGGESTIONS = [
  {
    text: 'Help me plan a small birthday party',
    icon: 'gift',
  },
  {
    text: 'Suggest a budget for my event',
    icon: 'dollar-sign',
  },
  {
    text: 'What tasks should I complete this week?',
    icon: 'check-square',
  },
  {
    text: 'Create a timeline for my event',
    icon: 'calendar',
  },
];

// ─────────────────────────────────────────────
// Markdown Renderer
// ─────────────────────────────────────────────

function MarkdownText({ content, isUser, isError }) {
  if (!content) return null;

  const baseColor = isUser
    ? '#fff'
    : isError
    ? COLORS.danger
    : COLORS.text;

  const lines = content.split('\n');
  const elements = [];

  let listBuffer = [];
  let numberedBuffer = [];

  const flushLists = (key) => {
    if (listBuffer.length > 0) {
      elements.push(
        <View key={`ul-${key}`} style={styles.listWrap}>
          {listBuffer.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <View
                style={[
                  styles.bulletDot,
                  {
                    backgroundColor: isUser
                      ? '#fff'
                      : COLORS.primary,
                  },
                ]}
              />
              <Text
                style={[
                  styles.listText,
                  { color: baseColor },
                ]}
              >
                {renderInline(item, isUser)}
              </Text>
            </View>
          ))}
        </View>
      );
      listBuffer = [];
    }

    if (numberedBuffer.length > 0) {
      elements.push(
        <View key={`ol-${key}`} style={styles.listWrap}>
          {numberedBuffer.map((item, i) => (
            <View key={i} style={styles.listItem}>
              <View
                style={[
                  styles.numberBadge,
                  {
                    backgroundColor: isUser
                      ? '#fff'
                      : COLORS.primarySoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.numberText,
                    { color: COLORS.primary },
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.listText,
                  { color: baseColor },
                ]}
              >
                {renderInline(item, isUser)}
              </Text>
            </View>
          ))}
        </View>
      );
      numberedBuffer = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();

    // Blank line
    if (line.trim() === '') {
      flushLists(idx);
      elements.push(
        <View
          key={`sp-${idx}`}
          style={{ height: 8 }}
        />
      );
      return;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushLists(idx);
      elements.push(
        <View
          key={`hr-${idx}`}
          style={[
            styles.hr,
            {
              backgroundColor: isUser
                ? 'rgba(255,255,255,0.3)'
                : COLORS.border,
            },
          ]}
        />
      );
      return;
    }

    // Headings
    const h1 = line.match(/^#\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);

    if (h1 || h2 || h3) {
      flushLists(idx);
      const text = (h1 || h2 || h3)[1];
      elements.push(
        <View
          key={`h-${idx}`}
          style={styles.headingRow}
        >
          <View
            style={[
              styles.headingAccent,
              {
                backgroundColor: isUser
                  ? '#fff'
                  : COLORS.primary,
              },
            ]}
          />
          <Text
            style={[
              styles.headingText,
              h2 && { fontSize: 17 },
              h3 && { fontSize: 15 },
              { color: baseColor },
            ]}
          >
            {renderInline(text, isUser)}
          </Text>
        </View>
      );
      return;
    }

    // Bullet list
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) {
      if (numberedBuffer.length) flushLists(idx);
      listBuffer.push(bullet[1]);
      return;
    }

    // Numbered list
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      if (listBuffer.length) flushLists(idx);
      numberedBuffer.push(numbered[1]);
      return;
    }

    // Paragraph
    flushLists(idx);
    elements.push(
      <Text
        key={`p-${idx}`}
        style={[
          styles.paragraph,
          { color: baseColor },
        ]}
      >
        {renderInline(line, isUser)}
      </Text>
    );
  });

  flushLists('end');
  return <View>{elements}</View>;
}

function renderInline(text, isUser) {
  const parts = [];
  const regex =
    /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith('**')) {
      parts.push(
        <Text
          key={`b-${key++}`}
          style={styles.bold}
        >
          {token.slice(2, -2)}
        </Text>
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <Text
          key={`c-${key++}`}
          style={[
            styles.code,
            {
              backgroundColor: isUser
                ? 'rgba(255,255,255,0.2)'
                : COLORS.primarySoft,
              color: isUser
                ? '#fff'
                : COLORS.primary,
            },
          ]}
        >
          {token.slice(1, -1)}
        </Text>
      );
    } else if (token.startsWith('*')) {
      parts.push(
        <Text
          key={`i-${key++}`}
          style={styles.italic}
        >
          {token.slice(1, -1)}
        </Text>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

// ─────────────────────────────────────────────
// AI Screen
// ─────────────────────────────────────────────

export default function AIScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // ───────────────────────────────────────────
  // Load context + chat history
  // ───────────────────────────────────────────

  const loadAIData = useCallback(async () => {
    try {
      setLoading(true);

      const [ctx, history] = await Promise.all([
        buildUserContext(),
        loadHistory(),
      ]);

      setContext(ctx);

      if (history && history.length > 0) {
        setMessages(
          history.map((message, index) => ({
            ...message,
            id: `history-${index}`,
          }))
        );
      } else {
        const firstName =
          user?.name?.split(' ')[0] ||
          user?.user_metadata?.name?.split(
            ' '
          )[0] ||
          'there';

        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content:
              `Hi ${firstName}! 👋\n\n` +
              `I'm your EventEase AI assistant. I can help you with:\n\n` +
              `- **Planning events** from scratch\n` +
              `- **Budget breakdowns** and cost estimates\n` +
              `- **Task lists** and timelines\n` +
              `- **Vendor suggestions**\n\n` +
              `Ask me anything to get started!`,
          },
        ]);
      }
    } catch (error) {
      console.error(
        'AI screen loading error:',
        error
      );

      setMessages([
        {
          id: 'welcome-error',
          role: 'assistant',
          content:
            'Hi! 👋 I’m your EventEase AI assistant. ' +
            'You can ask me anything about event planning.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAIData();
  }, [loadAIData]);

  // ───────────────────────────────────────────
  // Scroll
  // ───────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  }, []);

  // ───────────────────────────────────────────
  // Send message
  // ───────────────────────────────────────────

  const handleSend = async (text) => {
    const msg = (text ?? input).trim();

    if (!msg || sending) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);
    setInput('');
    setSending(true);

    scrollToBottom();

    try {
      // Save user message
      await saveMessage('user', msg);

      // Send complete conversation + context
      const result = await sendMessage(
        nextMessages,
        context
      );

      if (!result.ok) {
        setMessages((previous) => [
          ...previous,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content:
              result.error ||
              'Sorry, I could not respond right now. Please try again.',
            error: true,
          },
        ]);

        return;
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);

      await saveMessage(
        'assistant',
        result.reply
      );

      scrollToBottom();
    } catch (error) {
      console.error(
        'handleSend error:',
        error
      );

      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content:
            'Something went wrong while contacting EventEase AI. Please try again.',
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // ───────────────────────────────────────────
  // Clear chat
  // ───────────────────────────────────────────

  const handleClear = async () => {
    if (sending) {
      return;
    }

    try {
      await clearHistory();

      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content:
            'Chat cleared. 👋 What would you like to plan next?',
        },
      ]);
    } catch (error) {
      console.error(
        'handleClear error:',
        error
      );
    }
  };

  // ───────────────────────────────────────────
  // Refresh event context
  // ───────────────────────────────────────────

  const refreshContext = async () => {
    try {
      const ctx = await buildUserContext();
      setContext(ctx);
    } catch (error) {
      console.error(
        'refreshContext error:',
        error
      );
    }
  };

  // ───────────────────────────────────────────
  // Loading
  // ───────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={['top']}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Loading EventEase AI...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ───────────────────────────────────────────
  // Main UI
  // ───────────────────────────────────────────

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 90 : 0
        }
        style={styles.keyboard}
      >
        <View
          style={[
            styles.container,
            isWide && styles.containerWide,
          ]}
        >
          {/* Header */}

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.aiAvatar}>
                <Feather
                  name="cpu"
                  size={22}
                  color="#fff"
                />
              </View>

              <View>
                <Text style={styles.headerTitle}>
                  AI Assistant
                </Text>

                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      sending &&
                        styles.statusDotThinking,
                    ]}
                  />

                  <Text
                    style={styles.headerStatus}
                  >
                    {sending
                      ? 'Thinking…'
                      : 'Online'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClear}
              style={styles.headerBtn}
              disabled={sending}
              activeOpacity={0.7}
            >
              <Feather
                name="refresh-cw"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Context */}

          {context?.events?.length > 0 && (
            <TouchableOpacity
              style={styles.contextPill}
              onPress={refreshContext}
              activeOpacity={0.8}
            >
              <Feather
                name="database"
                size={14}
                color={COLORS.primary}
              />

              <Text style={styles.contextText}>
                Knows about{' '}
                {context.events.length}{' '}
                {context.events.length === 1
                  ? 'event'
                  : 'events'}
              </Text>

              <Feather
                name="refresh-cw"
                size={12}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          )}

          {/* Messages */}

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={
              styles.messages
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={
              scrollToBottom
            }
          >
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}

            {sending && <TypingBubble />}

            {/* Suggestions */}

            {messages.length <= 1 &&
              !sending && (
                <View
                  style={styles.suggestions}
                >
                  <Text
                    style={
                      styles.suggestionsTitle
                    }
                  >
                    Try asking
                  </Text>

                  {SUGGESTIONS.map(
                    (suggestion) => (
                      <TouchableOpacity
                        key={suggestion.text}
                        style={
                          styles.suggestionCard
                        }
                        onPress={() =>
                          handleSend(
                            suggestion.text
                          )
                        }
                        activeOpacity={0.85}
                      >
                        <View
                          style={
                            styles.suggestionIcon
                          }
                        >
                          <Feather
                            name={
                              suggestion.icon
                            }
                            size={18}
                            color={
                              COLORS.primary
                            }
                          />
                        </View>

                        <Text
                          style={
                            styles.suggestionText
                          }
                        >
                          {suggestion.text}
                        </Text>

                        <Feather
                          name="arrow-right"
                          size={18}
                          color={
                            COLORS.textMuted
                          }
                        />
                      </TouchableOpacity>
                    )
                  )}
                </View>
              )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Input */}

          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything about your events…"
              placeholderTextColor={
                COLORS.textLight
              }
              multiline
              maxLength={500}
              editable={!sending}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                if (input.trim()) {
                  handleSend();
                }
              }}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!input.trim() || sending) &&
                  styles.sendBtnDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={
                !input.trim() || sending
              }
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator
                  color="#fff"
                  size="small"
                />
              ) : (
                <Feather
                  name="send"
                  size={20}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────

function MessageBubble({ message }) {
  const isUser =
    message.role === 'user';

  const isError =
    message.error === true;

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser
          ? styles.bubbleRowUser
          : styles.bubbleRowAI,
      ]}
    >
      {!isUser && (
        <View
          style={[
            styles.bubbleAvatar,
            isError &&
              styles.bubbleAvatarError,
          ]}
        >
          <Feather
            name={
              isError
                ? 'alert-circle'
                : 'cpu'
            }
            size={14}
            color="#fff"
          />
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser
            ? styles.bubbleUser
            : styles.bubbleAI,
          isError &&
            styles.bubbleError,
        ]}
      >
        <MarkdownText
          content={message.content}
          isUser={isUser}
          isError={isError}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Typing Bubble
// ─────────────────────────────────────────────

function TypingBubble() {
  return (
    <View
      style={[
        styles.bubbleRow,
        styles.bubbleRowAI,
      ]}
    >
      <View style={styles.bubbleAvatar}>
        <Feather
          name="cpu"
          size={14}
          color="#fff"
        />
      </View>

      <View
        style={[
          styles.bubble,
          styles.bubbleAI,
          styles.typingBubble,
        ]}
      >
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
        />

        <Text style={styles.typingText}>
          Thinking…
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboard: {
    flex: 1,
  },

  container: {
    flex: 1,
    width: '100%',
  },

  containerWide: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  aiAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },

  statusDotThinking: {
    backgroundColor: COLORS.warning,
  },

  headerStatus: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  headerBtn: {
    padding: 8,
  },

  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.full,
  },

  contextText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },

  messages: {
    padding: SPACING.lg,
    gap: 12,
  },

  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '100%',
  },

  bubbleRowUser: {
    justifyContent: 'flex-end',
  },

  bubbleRowAI: {
    justifyContent: 'flex-start',
  },

  bubbleAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bubbleAvatarError: {
    backgroundColor: COLORS.danger,
  },

  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
  },

  bubbleAI: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },

  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },

  bubbleError: {
    backgroundColor: '#fef2f2',
    borderColor: COLORS.danger,
  },

  bubbleText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 23,
  },

  bubbleTextUser: {
    color: '#fff',
  },

  bubbleTextError: {
    color: COLORS.danger,
  },

  // ─── Markdown styles ─────────────────────
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },

  bold: {
    fontWeight: '700',
  },

  italic: {
    fontStyle: 'italic',
  },

  code: {
    fontFamily:
      Platform.OS === 'ios'
        ? 'Menlo'
        : 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },

  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
    gap: 8,
  },

  headingAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },

  headingText: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },

  listWrap: {
    marginTop: 4,
    gap: 6,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },

  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },

  numberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  numberText: {
    fontSize: 11,
    fontWeight: '800',
  },

  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },

  hr: {
    height: 1,
    marginVertical: 8,
  },

  // ─── Typing ──────────────────────────────
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },

  typingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // ─── Suggestions ─────────────────────────
  suggestions: {
    marginTop: SPACING.lg,
    gap: 10,
  },

  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
  },

  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },

  // ─── Input ───────────────────────────────
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendBtnDisabled: {
    opacity: 0.4,
  },
});