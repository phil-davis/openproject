#-- copyright
# OpenProject is an open source project management software.
# Copyright (C) 2012-2021 the OpenProject GmbH
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2013 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See docs/COPYRIGHT.rdoc for more details.
#++

require 'spec_helper'

describe ::API::V3::UserPreferences::NotificationSettingRepresenter, 'rendering' do
  include ::API::V3::Utilities::PathHelper

  subject(:generated) { representer.to_json }

  let(:project) { FactoryBot.build_stubbed :project }
  let(:notification_setting) { FactoryBot.build_stubbed(:notification_setting, project: project) }

  let(:representer) do
    described_class.create notification_setting,
                           current_user: current_user,
                           embed_links: embed_links
  end

  let(:embed_links) { true }

  current_user { FactoryBot.build_stubbed(:user) }

  describe '_links' do
    describe 'self' do
      # No self link as the representer is rendered as part of the user preferences.
      it_behaves_like 'has no link' do
        let(:link) { 'self' }
      end
    end

    describe 'project' do
      it_behaves_like 'has a titled link' do
        let(:link) { 'project' }
        let(:href) { api_v3_paths.project(project.id) }
        let(:title) { project.name }
      end
    end
  end

  describe 'properties' do
    it 'has no _type' do
      expect(generated)
        .not_to have_json_path('_type')
    end

    it_behaves_like 'property', :channel do
      let(:value) { notification_setting.channel }
    end

    it_behaves_like 'property', :watched do
      let(:value) { notification_setting.watched }
    end

    it_behaves_like 'property', :involved do
      let(:value) { notification_setting.involved }
    end

    it_behaves_like 'property', :mentioned do
      let(:value) { notification_setting.mentioned }
    end

    it_behaves_like 'property', :all do
      let(:value) { notification_setting.all }
    end

    it_behaves_like 'property', :workPackageCommented do
      let(:value) { notification_setting.work_package_commented }
    end

    it_behaves_like 'property', :workPackageCreated do
      let(:value) { notification_setting.work_package_created }
    end
  end

  describe '_embedded' do
    describe 'project' do
      it 'skips embedding the project' do
        expect(generated)
          .not_to have_json_path('_embedded/project')
      end
    end
  end
end
