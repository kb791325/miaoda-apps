import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import { FolderOpen, Megaphone } from 'lucide-react';
import { ContentManageTab } from './ContentManageTab';
import { MaterialLibraryTab } from './MaterialLibraryTab';

const ContentCenterPage = () => {
  const [activeTab, setActiveTab] = useState<string>('content');

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">招生内容中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI 创作招生内容，统一审核、排期发布并沉淀营销素材
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content">
            <Megaphone className="size-4" />
            内容管理
          </TabsTrigger>
          <TabsTrigger value="materials">
            <FolderOpen className="size-4" />
            素材库
          </TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <Card>
            <CardContent className="pt-6">
              <ContentManageTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">营销素材库</CardTitle>
            </CardHeader>
            <CardContent>
              <MaterialLibraryTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentCenterPage;
