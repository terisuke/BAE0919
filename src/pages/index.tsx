import Image from 'next/image';
import { useCallback, useContext, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/iconButton';
import { Introduction } from '@/components/introduction';
import { Menu } from '@/components/menu';
import { MessageInputContainer } from '@/components/messageInputContainer';
import { Meta } from '@/components/meta';
import VrmViewer from '@/components/vrmViewer';
import {
  AIService,
  AIServiceConfig,
  getAIChatResponseStream,
} from '@/features/chat/aiChatFactory';
import {
  Message,
  textsToScreenplay,
  Screenplay,
} from '@/features/messages/messages';
import { speakCharacter } from '@/features/messages/speakCharacter';
import store from '@/features/stores/app';
import { ViewerContext } from '@/features/vrmViewer/viewerContext';
import { fetchAndProcessComments } from '@/features/youtube/youtubeComments';
import '@/lib/i18n';
import { buildUrl } from '@/utils/buildUrl';

export default function Home() {
  const { viewer } = useContext(ViewerContext);

  const [changeEnglishToJapanese, setChangeEnglishToJapanese] = useState(false);
  const [conversationContinuityMode, setConversationContinuityMode] =
    useState(false);
  const [chatProcessing, setChatProcessing] = useState(false);
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [codeLog, setCodeLog] = useState<Message[]>([]);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [webSocketMode, changeWebSocketMode] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false); // WebSocketモード用の設定
  const { t } = useTranslation();
  const INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS = 5000; // 5秒
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    process.env.NEXT_PUBLIC_BACKGROUND_IMAGE_PATH !== undefined
      ? process.env.NEXT_PUBLIC_BACKGROUND_IMAGE_PATH
      : '/bg-c.png',
  );
  const [dontShowIntroduction, setDontShowIntroduction] = useState(false);
  const [youtubeNextPageToken, setYoutubeNextPageToken] = useState('');
  const [youtubeContinuationCount, setYoutubeContinuationCount] = useState(0);
  const [youtubeNoCommentCount, setYoutubeNoCommentCount] = useState(0);
  const [youtubeSleepMode, setYoutubeSleepMode] = useState(false);
  const [chatProcessingCount, setChatProcessingCount] = useState(0);
  const [modalImage, setModalImage] = useState('');
  const [triggerShutter, setTriggerShutter] = useState(false);
  const [delayedText, setDelayedText] = useState('');
  const [webcamStatus, setWebcamStatus] = useState(false);

  const incrementChatProcessingCount = () => {
    setChatProcessingCount((prevCount) => prevCount + 1);
  };

  const decrementChatProcessingCount = () => {
    setChatProcessingCount((prevCount) => prevCount - 1);
  };

  useEffect(() => {
    const storedData = window.localStorage.getItem('chatVRMParams');
    if (storedData) {
      const params = JSON.parse(storedData);
      setChatLog(Array.isArray(params.chatLog) ? params.chatLog : []);
      setCodeLog(Array.isArray(params.codeLog) ? params.codeLog : []);
      setChangeEnglishToJapanese(params.changeEnglishToJapanese || false);
      setConversationContinuityMode(params.conversationContinuityMode || false);
      changeWebSocketMode(params.webSocketMode || false);
      setDontShowIntroduction(params.dontShowIntroduction || false);
    }
  }, []);

  useEffect(() => {
    const params = {
      chatLog,
      codeLog,
      changeEnglishToJapanese,
      conversationContinuityMode,
      webSocketMode,
      dontShowIntroduction,
    };
    process.nextTick(() =>
      window.localStorage.setItem('chatVRMParams', JSON.stringify(params)),
    );
  }, [
    chatLog,
    codeLog,
    changeEnglishToJapanese,
    conversationContinuityMode,
    webSocketMode,
    dontShowIntroduction,
  ]);

  const handleChangeChatLog = useCallback(
    (targetIndex: number, text: string) => {
      const newChatLog = chatLog.map((v: Message, i) => {
        return i === targetIndex ? { role: v.role, content: text } : v;
      });

      setChatLog(newChatLog);
    },
    [chatLog],
  );

  const handleChangeCodeLog = useCallback(
    async (targetIndex: number, text: string) => {
      const newCodeLog = codeLog.map((v: Message, i) => {
        return i === targetIndex ? { role: v.role, content: text } : v;
      });

      setCodeLog(newCodeLog);
    },
    [codeLog],
  );

  /**
   * 文ごとに音声を直列でリクエストしながら再生する
   */
  const handleSpeakAi = useCallback(
    async (
      screenplay: Screenplay,
      onStart?: () => void,
      onEnd?: () => void,
    ) => {
      speakCharacter(
        screenplay,
        viewer,
        changeEnglishToJapanese,
        onStart,
        onEnd,
      );
    },
    [viewer, changeEnglishToJapanese],
  );

  const wsRef = useRef<WebSocket | null>(null);

  /**
   * AIからの応答を処理する関数
   * @param currentChatLog ログに残るメッセージの配列
   * @param messages 解答生成に使用するメッセージの配列
   */
  const processAIResponse = useCallback(
    async (currentChatLog: Message[], messages: Message[]) => {
      setChatProcessing(true);
      let stream;

      const s = store.getState();

      const aiServiceConfig: AIServiceConfig = {
        openai: {
          key: s.openAiKey || process.env.NEXT_PUBLIC_OPEN_AI_KEY || '',
          model: s.selectAIModel,
        },
        anthropic: {
          key: s.anthropicKey || process.env.NEXT_PUBLIC_ANTHROPIC_KEY || '',
          model: s.selectAIModel,
        },
        google: {
          key: s.googleKey || process.env.NEXT_PUBLIC_GOOGLE_KEY || '',
          model: s.selectAIModel,
        },
        localLlm: {
          url: s.localLlmUrl || process.env.NEXT_PUBLIC_LOCAL_LLM_URL || '',
          model:
            s.selectAIModel || process.env.NEXT_PUBLIC_LOCAL_LLM_MODEL || '',
        },
        groq: {
          key: s.groqKey || process.env.NEXT_PUBLIC_GROQ_KEY || '',
          model: s.selectAIModel,
        },
        dify: {
          key: s.difyKey || process.env.NEXT_PUBLIC_DIFY_KEY || '',
          url: s.difyUrl || process.env.NEXT_PUBLIC_DIFY_URL || '',
          conversationId: s.difyConversationId,
        },
      };

      try {
        stream = await getAIChatResponseStream(
          s.selectAIService as AIService,
          messages,
          aiServiceConfig,
        );
      } catch (e) {
        console.error(e);
        stream = null;
      }

      if (stream == null) {
        setChatProcessing(false);
        return;
      }

      const reader = stream.getReader();
      let receivedMessage = '';
      let aiTextLog: Message[] = []; // 会話ログ欄で使用
      let tag = '';
      let isCodeBlock = false;
      let codeBlockText = '';
      const sentences = new Array<string>(); // AssistantMessage欄で使用
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done && receivedMessage.length === 0) break;

          if (value) receivedMessage += value;

          // 返答内容のタグ部分と返答部分を分離
          const tagMatch = receivedMessage.match(/^\[(.*?)\]/);
          if (tagMatch && tagMatch[0]) {
            tag = tagMatch[0];
            receivedMessage = receivedMessage.slice(tag.length);
          }

          // 返答を一文単位で切り出して処理する
          while (receivedMessage.length > 0) {
            const sentenceMatch = receivedMessage.match(
              /^(.+?[。．.!?！？\n]|.{20,}[、,])/,
            );
            if (sentenceMatch?.[0]) {
              let sentence = sentenceMatch[0];
              // 区切った文字をsentencesに追加
              sentences.push(sentence);
              // 区切った文字の残りでreceivedMessageを更新
              receivedMessage = receivedMessage
                .slice(sentence.length)
                .trimStart();

              // 発話不要/不可能な文字列だった場合はスキップ
              if (
                !sentence.includes('```') &&
                !sentence.replace(
                  /^[\s\u3000\t\n\r\[\(\{「［（【『〈《〔｛«‹〘〚〛〙›»〕》〉』】）］」\}\)\]'"''""・、。,.!?！？:：;；\-_=+~～*＊@＠#＃$＄%％^＾&＆|｜\\＼/／`｀]+$/gu,
                  '',
                )
              ) {
                continue;
              }

              // タグと返答を結合（音声再生で使用される）
              let aiText = `${tag} ${sentence}`;
              console.log('aiText', aiText);

              if (isCodeBlock && !sentence.includes('```')) {
                codeBlockText += sentence;
                continue;
              }

              if (sentence.includes('```')) {
                if (isCodeBlock) {
                  // コードブロックの終了処理
                  const [codeEnd, ...restOfSentence] = sentence.split('```');
                  aiTextLog.push({
                    role: 'code',
                    content: codeBlockText + codeEnd,
                  });
                  aiText += `${tag} ${restOfSentence.join('```') || ''}`;

                  // AssistantMessage欄の更新
                  setAssistantMessage(sentences.join(' '));

                  codeBlockText = '';
                  isCodeBlock = false;
                } else {
                  // コードブロックの開始処理
                  isCodeBlock = true;
                  [aiText, codeBlockText] = aiText.split('```');
                }

                sentence = sentence.replace(/```/g, '');
              }

              const aiTalks = textsToScreenplay([aiText], s.koeiroParam);
              aiTextLog.push({ role: 'assistant', content: sentence });

              // 文ごとに音声を生成 & 再生、返答を表示
              const currentAssistantMessage = sentences.join(' ');

              handleSpeakAi(
                aiTalks[0],
                () => {
                  setAssistantMessage(currentAssistantMessage);
                  incrementChatProcessingCount();
                },
                () => {
                  decrementChatProcessingCount();
                },
              );
            } else {
              // マッチする文がない場合、ループを抜ける
              break;
            }
          }

          // ストリームが終了し、receivedMessageが空でない場合の処理
          if (done && receivedMessage.length > 0) {
            // 残りのメッセージを処理
            let aiText = `${tag} ${receivedMessage}`;
            const aiTalks = textsToScreenplay([aiText], s.koeiroParam);
            aiTextLog.push({ role: 'assistant', content: receivedMessage });
            sentences.push(receivedMessage);

            const currentAssistantMessage = sentences.join(' ');

            handleSpeakAi(
              aiTalks[0],
              () => {
                setAssistantMessage(currentAssistantMessage);
                incrementChatProcessingCount();
              },
              () => {
                decrementChatProcessingCount();
              },
            );

            receivedMessage = '';
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        reader.releaseLock();
      }

      // 直前のroleと同じならば、contentを結合し、空のcontentを除外する
      let lastImageUrl = '';
      aiTextLog = aiTextLog
        .reduce((acc: Message[], item: Message) => {
          if (
            typeof item.content != 'string' &&
            item.content[0] &&
            item.content[1].image_url
          ) {
            lastImageUrl = item.content[1].image_url.url;
          }

          const lastItem = acc[acc.length - 1];
          if (lastItem && lastItem.role === item.role) {
            if (typeof item.content != 'string') {
              lastItem.content += ' ' + item.content[0].text;
            } else {
              lastItem.content += ' ' + item.content;
            }
          } else {
            const text =
              typeof item.content != 'string'
                ? item.content[0].text
                : item.content;
            if (lastImageUrl != '') {
              acc.push({
                ...item,
                content: [
                  { type: 'text', text: text.trim() },
                  { type: 'image_url', image_url: { url: lastImageUrl } },
                ],
              });
              lastImageUrl = '';
            } else {
              acc.push({ ...item, content: text.trim() });
            }
          }
          return acc;
        }, [])
        .filter((item) => item.content !== '');

      setChatLog([...currentChatLog, ...aiTextLog]);
      setChatProcessing(false);
    },
    [handleSpeakAi],
  );

  const preProcessAIResponse = useCallback(
    async (messages: Message[]) => {
      await processAIResponse(chatLog, messages);
    },
    [chatLog, processAIResponse],
  );

  /**
   * アシスタントとの会話を行う
   */
  const handleSendChat = useCallback(
    async (text: string, role?: string) => {
      const newMessage = text;

      if (newMessage == null) {
        return;
      }

      const s = store.getState();
      if (webSocketMode) {
        // 未メンテなので不具合がある可能性あり
        console.log('websocket mode: true');
        setChatProcessing(true);

        if (role !== undefined && role !== 'user') {
          // WebSocketからの返答を処理

          if (role == 'assistant') {
            let aiText = `${'[neutral]'} ${newMessage}`;
            try {
              const aiTalks = textsToScreenplay([aiText], s.koeiroParam);

              // 文ごとに音声を生成 & 再生、返答を表示
              handleSpeakAi(aiTalks[0], async () => {
                // アシスタントの返答をログに追加
                const updateLog: Message[] = [
                  ...codeLog,
                  { role: 'assistant', content: newMessage },
                ];
                setChatLog(updateLog);
                setCodeLog(updateLog);

                setAssistantMessage(newMessage);
                setIsVoicePlaying(false);
                setChatProcessing(false);
              });
            } catch (e) {
              setIsVoicePlaying(false);
              setChatProcessing(false);
            }
          } else if (
            role == 'code' ||
            role == 'output' ||
            role == 'executing'
          ) {
            // コードコメントの処理
            // ループ完了後にAI応答をコードログに追加
            const updateLog: Message[] = [
              ...codeLog,
              { role: role, content: newMessage },
            ];
            setCodeLog(updateLog);
            setChatProcessing(false);
          } else {
            // その他のコメントの処理（現想定では使用されないはず）
            console.log('error role:', role);
          }
        } else {
          // WebSocketで送信する処理

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // ユーザーの発言を追加して表示
            const updateLog: Message[] = [
              ...codeLog,
              { role: 'user', content: newMessage },
            ];
            setChatLog(updateLog);
            setCodeLog(updateLog);

            // WebSocket送信
            wsRef.current.send(
              JSON.stringify({ content: newMessage, type: 'chat' }),
            );
          } else {
            setAssistantMessage(t('NotConnectedToExternalAssistant'));
            setChatProcessing(false);
          }
        }
      } else {
        // ChatVRM original mode
        const emptyKeys = [
          s.selectAIService === 'openai' &&
            !s.openAiKey &&
            !process.env.NEXT_PUBLIC_OPEN_AI_KEY,

          s.selectAIService === 'anthropic' &&
            !s.anthropicKey &&
            !process.env.NEXT_PUBLIC_ANTHROPIC_KEY,

          s.selectAIService === 'google' &&
            !s.googleKey &&
            !process.env.NEXT_PUBLIC_GOOGLE_KEY,

          s.selectAIService === 'groq' &&
            !s.groqKey &&
            !process.env.NEXT_PUBLIC_GROQ_KEY,

          s.selectAIService === 'dify' &&
            !s.difyKey &&
            !process.env.NEXT_PUBLIC_DIFY_KEY,
        ];
        if (emptyKeys.includes(true)) {
          setAssistantMessage(t('APIKeyNotEntered'));
          return;
        }

        setChatProcessing(true);
        // ユーザーの発言を追加して表示
        const messageLog: Message[] = [
          ...chatLog,
          {
            role: 'user',
            content:
              modalImage &&
              s.selectAIService === 'openai' &&
              (s.selectAIModel === 'gpt-4o-mini' ||
                s.selectAIModel === 'gpt-4o' ||
                s.selectAIModel === 'gpt-4-turbo')
                ? [
                    { type: 'text', text: newMessage },
                    { type: 'image_url', image_url: { url: modalImage } },
                  ]
                : newMessage,
          },
        ];
        if (modalImage) {
          //setModalImage("");
          clear();
        }
        setChatLog(messageLog);

        // TODO: AIに送信するメッセージの加工、処理がひどいので要修正
        const processedMessageLog = messageLog.map((message) => ({
          role: ['assistant', 'user', 'system'].includes(message.role)
            ? message.role
            : 'assistant',
          content:
            typeof message.content === 'string' ||
            (s.selectAIService === 'openai' &&
              (s.selectAIModel === 'gpt-4o-mini' ||
                s.selectAIModel === 'gpt-4o' ||
                s.selectAIModel === 'gpt-4-turbo'))
              ? message.content
              : message.content[0].text,
        }));

        const messages: Message[] = [
          {
            role: 'system',
            content: s.systemPrompt,
          },
          ...processedMessageLog.slice(-10),
        ];

        try {
          await processAIResponse(messageLog, messages);
        } catch (e) {
          console.error(e);
        }

        setChatProcessing(false);
      }
    },
    [
      webSocketMode,
      handleSpeakAi,
      codeLog,
      t,
      chatLog,
      processAIResponse,
      modalImage,
      delayedText,
    ],
  );

  ///取得したコメントをストックするリストの作成（tmpMessages）
  interface tmpMessage {
    text: string;
    role: string;
    emotion: string;
  }
  const [tmpMessages, setTmpMessages] = useState<tmpMessage[]>([]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      console.log('WebSocket connection opened:', event);
    };
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message:', event.data);
      const jsonData = JSON.parse(event.data);
      setTmpMessages((prevMessages) => [...prevMessages, jsonData]);
    };
    const handleError = (event: Event) => {
      console.error('WebSocket error:', event);
    };
    const handleClose = (event: Event) => {
      console.log('WebSocket connection closed:', event);
    };

    function setupWebsocket() {
      const ws = new WebSocket('ws://localhost:8000/ws');
      ws.addEventListener('open', handleOpen);
      ws.addEventListener('message', handleMessage);
      ws.addEventListener('error', handleError);
      ws.addEventListener('close', handleClose);
      return ws;
    }
    let ws = setupWebsocket();
    wsRef.current = ws;

    const reconnectInterval = setInterval(() => {
      if (
        webSocketMode &&
        ws.readyState !== WebSocket.OPEN &&
        ws.readyState !== WebSocket.CONNECTING
      ) {
        setChatProcessing(false);
        console.log('try reconnecting...');
        ws.close();
        ws = setupWebsocket();
        wsRef.current = ws;
      }
    }, 1000);

    return () => {
      clearInterval(reconnectInterval);
      ws.close();
    };
  }, [webSocketMode]);

  // WebSocketモード用の処理
  useEffect(() => {
    if (tmpMessages.length > 0 && !isVoicePlaying) {
      const message = tmpMessages[0];
      if (message.role == 'assistant') {
        setIsVoicePlaying(true);
      }
      setTmpMessages((tmpMessages) => tmpMessages.slice(1));
      handleSendChat(message.text, message.role);
    }
  }, [tmpMessages, isVoicePlaying, handleSendChat]);

  // YouTubeコメントを取得する処理
  const fetchAndProcessCommentsCallback = useCallback(async () => {
    const s = store.getState();

    if (
      !s.openAiKey ||
      !s.youtubeLiveId ||
      !s.youtubeApiKey ||
      chatProcessing ||
      chatProcessingCount > 0
    ) {
      return;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS),
    );
    console.log('Call fetchAndProcessComments !!!');

    fetchAndProcessComments(
      chatLog,
      s.selectAIService === 'anthropic' ? s.anthropicKey : s.openAiKey,
      s.youtubeLiveId,
      s.youtubeApiKey,
      youtubeNextPageToken,
      setYoutubeNextPageToken,
      youtubeNoCommentCount,
      setYoutubeNoCommentCount,
      youtubeContinuationCount,
      setYoutubeContinuationCount,
      youtubeSleepMode,
      setYoutubeSleepMode,
      conversationContinuityMode,
      handleSendChat,
      preProcessAIResponse,
    );
  }, [
    chatProcessing,
    chatProcessingCount,
    chatLog,
    youtubeNextPageToken,
    youtubeNoCommentCount,
    youtubeContinuationCount,
    youtubeSleepMode,
    conversationContinuityMode,
    handleSendChat,
    preProcessAIResponse,
  ]);

  useEffect(() => {
    console.log('chatProcessingCount:', chatProcessingCount);
    fetchAndProcessCommentsCallback();
  }, [chatProcessingCount, conversationContinuityMode]);

  useEffect(() => {
    if (youtubeNoCommentCount < 1) return;
    console.log('youtubeSleepMode:', youtubeSleepMode);
    setTimeout(() => {
      fetchAndProcessCommentsCallback();
    }, INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS);
  }, [youtubeNoCommentCount, conversationContinuityMode]);

  const handleChangeModelImage = useCallback(
    async (image: string) => {
      //console.log(image);
      if (image != '') {
        console.log('capture');
        setModalImage(image);
        setTriggerShutter(false); // シャッターをリセット
      }
    },
    [modalImage, setModalImage, handleSendChat],
  );

  const clear = useCallback(async () => {
    setModalImage('');
  }, []);

  useEffect(() => {
    // テキストと画像がそろったら、チャットを送信
    if (delayedText && modalImage) {
      handleSendChat(delayedText);
      setDelayedText('');
    }
  }, [modalImage, delayedText]);

  const handleVoiceShutter = useCallback(async () => {
    setTriggerShutter(true);
  }, []);

  const hookSendChat = useCallback(
    (text: string) => {
      handleVoiceShutter();
      // MENUの中でshowCameraがtrueの場合、画像が取得されるまで待機
      if (webcamStatus) {
        // Webcamが開いている場合
        setDelayedText(text); // 画像が取得されるまで遅延させる
      } else {
        handleSendChat(text);
      }
    },
    [
      handleSendChat,
      modalImage,
      setModalImage,
      webcamStatus,
      delayedText,
      setDelayedText,
    ],
  );

  const handleStatusWebcam = useCallback(async (status: boolean) => {
    setWebcamStatus(status); // カメラが開いているかどうかの状態を更新
  }, []);

  const handleImageDropped = useCallback(
    async (image: string) => {
      if (image !== '') {
        setModalImage(image);
      }
    },
    [setModalImage],
  );

  return (
    <>
      <div
        className={'font-M_PLUS_2'}
        style={{
          backgroundImage: `url(${buildUrl(backgroundImageUrl)})`,
          backgroundSize: 'cover',
          minHeight: '100vh',
        }}
      >
        <Meta />
        {!dontShowIntroduction && (
          <Introduction
            dontShowIntroduction={dontShowIntroduction}
            onChangeDontShowIntroduction={setDontShowIntroduction}
          />
        )}
        <VrmViewer onImageDropped={handleImageDropped} />
        <MessageInputContainer
          isChatProcessing={chatProcessing}
          onChatProcessStart={hookSendChat}
        />
        <Menu
          chatLog={chatLog}
          codeLog={codeLog}
          assistantMessage={assistantMessage}
          conversationContinuityMode={conversationContinuityMode}
          onChangeChatLog={handleChangeChatLog}
          onChangeCodeLog={handleChangeCodeLog}
          onChangeConversationContinuityMode={setConversationContinuityMode}
          handleClickResetChatLog={() => setChatLog([])}
          handleClickResetCodeLog={() => setCodeLog([])}
          webSocketMode={webSocketMode}
          changeWebSocketMode={changeWebSocketMode}
          changeEnglishToJapanese={changeEnglishToJapanese}
          setChangeEnglishToJapanese={setChangeEnglishToJapanese}
          setBackgroundImageUrl={setBackgroundImageUrl}
          onChangeModalImage={handleChangeModelImage}
          triggerShutter={triggerShutter}
          onChangeWebcamStatus={handleStatusWebcam}
        />
        {modalImage && (
          <div className="row-span-1 flex justify-end max-h-[40vh]">
            <div className="relative w-full md:max-w-[512px] max-w-[50%] m-16">
              <Image
                src={modalImage}
                width={512}
                height={512}
                alt="Modal Image"
                className="rounded-8 w-auto object-contain max-h-[100%] ml-auto"
              />
              <div className="absolute top-4 right-4">
                <IconButton
                  iconName="24/Trash"
                  className="hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled m-8"
                  isProcessing={false}
                  onClick={clear}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
